package com.fangyu.code.domain.service;

import java.util.function.BooleanSupplier;
import java.util.function.Consumer;

import org.springframework.stereotype.Service;

import com.fangyu.code.domain.model.QueuedPromptTask;
import com.fangyu.code.shared.dto.SupervisorSnapshot;
import com.fangyu.code.shared.dto.TaskChunkEvent;
import com.fangyu.code.shared.dto.TaskProgressEvent;

@Service
public class DualCodexTask {

    private final TaskSupervisor taskSupervisor;

    public DualCodexTask(TaskSupervisor taskSupervisor) {
        this.taskSupervisor = taskSupervisor;
    }

    public TaskSupervisor.SupervisedExecutionResult execute(
        QueuedPromptTask task,
        ContextCompressionService.ContextWindow context,
        Consumer<TaskProgressEvent> progressSink,
        Consumer<TaskChunkEvent> chunkSink,
        Consumer<SupervisorSnapshot> supervisorSink,
        BooleanSupplier cancelled
    ) throws Exception {
        String sharedContext = context.renderForModel();
        String primaryPrompt = """
            Shared context:
            %s

            User objective:
            %s

            Produce the implementation-ready answer first.
            """.formatted(sharedContext, task.prompt());

        String reviewerPrompt = """
            Shared context:
            %s

            Primary task objective:
            %s

            Work as a parallel reviewer. Focus on:
            1. Hidden implementation risks
            2. Wasteful token usage
            3. Missing edge cases
            4. Concrete course corrections
            """.formatted(sharedContext, task.prompt());

        return taskSupervisor.executeDual(
            task.taskId(),
            task.sessionId(),
            primaryPrompt,
            reviewerPrompt,
            progressSink,
            chunkSink,
            supervisorSink,
            cancelled
        );
    }
}
