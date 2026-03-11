package com.fangyu.code.domain.service;

import java.time.Clock;
import java.time.Duration;
import java.util.function.BooleanSupplier;
import java.util.function.Consumer;

import org.springframework.stereotype.Service;

import com.fangyu.code.domain.engine.AiEngine;
import com.fangyu.code.domain.engine.EngineExecutionObserver;
import com.fangyu.code.domain.engine.EngineExecutionRequest;
import com.fangyu.code.domain.engine.EngineExecutionResult;
import com.fangyu.code.domain.model.QueuedPromptTask;
import com.fangyu.code.shared.dto.PromptMessageView;
import com.fangyu.code.shared.dto.SupervisorSnapshot;
import com.fangyu.code.shared.dto.TaskChunkEvent;
import com.fangyu.code.shared.dto.TaskProgressEvent;

@Service
public class PromptExecutionService {

    private final AiEngineRegistry engineRegistry;
    private final HistoryService historyService;
    private final ContextCompressionService contextCompressionService;
    private final TaskContextAttachmentService taskContextAttachmentService;
    private final DualCodexTask dualCodexTask;
    private final Clock clock;

    public PromptExecutionService(
        AiEngineRegistry engineRegistry,
        HistoryService historyService,
        ContextCompressionService contextCompressionService,
        TaskContextAttachmentService taskContextAttachmentService,
        DualCodexTask dualCodexTask,
        Clock clock
    ) {
        this.engineRegistry = engineRegistry;
        this.historyService = historyService;
        this.contextCompressionService = contextCompressionService;
        this.taskContextAttachmentService = taskContextAttachmentService;
        this.dualCodexTask = dualCodexTask;
        this.clock = clock;
    }

    public ExecutionReport execute(
        QueuedPromptTask task,
        Consumer<TaskProgressEvent> progressSink,
        Consumer<TaskChunkEvent> chunkSink,
        Consumer<SupervisorSnapshot> supervisorSink,
        BooleanSupplier cancelled
    ) throws Exception {
        historyService.ensureSession(task.sessionId(), task.engine());
        historyService.appendUserMessage(task.sessionId(), task.taskId(), task.prompt());

        progressSink.accept(new TaskProgressEvent(
            task.taskId(),
            task.sessionId(),
            "PROCESSING",
            "context:building",
            0.12d,
            "Collecting historical context",
            "NONE",
            "prepare-context",
            clock.millis()
        ));

        var messages = historyService.messages(task.sessionId());
        var context = contextCompressionService.buildWindow(messages);
        String attachmentContext = taskContextAttachmentService.renderContextBlock(task.workspacePath(), task.contextFiles());

        if (task.dualMode()) {
            var result = dualCodexTask.execute(task, context, progressSink, chunkSink, supervisorSink, cancelled);
            historyService.appendAssistantMessage(
                task.sessionId(),
                task.taskId(),
                result.combinedContent(),
                result.totalInputTokens(),
                result.totalOutputTokens(),
                result.totalCostUsd()
            );
            progressSink.accept(new TaskProgressEvent(
                task.taskId(),
                task.sessionId(),
                "COMPLETED",
                "dual:completed",
                1d,
                "Primary and reviewer streams merged",
                result.snapshot().peerImpact(),
                "persist-history",
                clock.millis()
            ));
            return new ExecutionReport(
                result.combinedContent(),
                result.totalInputTokens(),
                result.totalOutputTokens(),
                result.totalCostUsd()
            );
        }

        AiEngine engine = engineRegistry.require(task.engine());
        String fullPrompt = """
            Context window:
            %s

            Workspace and attached files:
            %s

            Latest user request:
            %s
            """.formatted(
            context.renderForModel(),
            attachmentContext.isBlank() ? "[none]" : attachmentContext,
            task.prompt()
        );

        EngineExecutionResult result = engine.execute(
            new EngineExecutionRequest(
                task.taskId(),
                task.sessionId(),
                fullPrompt,
                "You are Fangyu Code's active AI engine. Give concise, implementation-first guidance.",
                ".",
                Duration.ofMinutes(15),
                cancelled
            ),
            new EngineExecutionObserver() {
                @Override
                public void onStage(String stage, double progress, String summary) {
                    progressSink.accept(new TaskProgressEvent(
                        task.taskId(),
                        task.sessionId(),
                        "PROCESSING",
                        stage,
                        progress,
                        summary,
                        "NONE",
                        "deliver",
                        clock.millis()
                    ));
                }

                @Override
                public void onChunk(String chunk) {
                    chunkSink.accept(new TaskChunkEvent(
                        task.taskId(),
                        task.sessionId(),
                        "assistant",
                        chunk,
                        false,
                        clock.millis()
                    ));
                }

                @Override
                public boolean isCancelled() {
                    return cancelled.getAsBoolean();
                }
            }
        );

        PromptMessageView assistantMessage = historyService.appendAssistantMessage(
            task.sessionId(),
            task.taskId(),
            result.content(),
            result.inputTokens(),
            result.outputTokens(),
            result.costUsd()
        );
        chunkSink.accept(new TaskChunkEvent(
            task.taskId(),
            task.sessionId(),
            assistantMessage.role(),
            "",
            true,
            clock.millis()
        ));
        progressSink.accept(new TaskProgressEvent(
            task.taskId(),
            task.sessionId(),
            "COMPLETED",
            "response:complete",
            1d,
            "Model response stored",
            "NONE",
            "persist-history",
            clock.millis()
        ));
        return new ExecutionReport(
            result.content(),
            result.inputTokens(),
            result.outputTokens(),
            result.costUsd()
        );
    }

    public record ExecutionReport(
        String content,
        int inputTokens,
        int outputTokens,
        double costUsd
    ) {}
}
