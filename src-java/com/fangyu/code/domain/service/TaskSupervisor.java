package com.fangyu.code.domain.service;

import java.time.Clock;
import java.time.Duration;
import java.util.concurrent.StructuredTaskScope;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.BooleanSupplier;
import java.util.function.Consumer;

import org.springframework.stereotype.Service;

import com.fangyu.code.domain.engine.AiEngine;
import com.fangyu.code.domain.engine.EngineExecutionObserver;
import com.fangyu.code.domain.engine.EngineExecutionRequest;
import com.fangyu.code.domain.engine.EngineExecutionResult;
import com.fangyu.code.domain.model.AiEngineKind;
import com.fangyu.code.domain.model.SupervisorRole;
import com.fangyu.code.shared.dto.SupervisorSnapshot;
import com.fangyu.code.shared.dto.TaskChunkEvent;
import com.fangyu.code.shared.dto.TaskProgressEvent;

@Service
public class TaskSupervisor {

    private final AiEngineRegistry engineRegistry;
    private final Clock clock;

    public TaskSupervisor(AiEngineRegistry engineRegistry, Clock clock) {
        this.engineRegistry = engineRegistry;
        this.clock = clock;
    }

    public SupervisedExecutionResult executeDual(
        String taskId,
        String sessionId,
        String primaryPrompt,
        String reviewerPrompt,
        Consumer<TaskProgressEvent> progressSink,
        Consumer<TaskChunkEvent> chunkSink,
        Consumer<SupervisorSnapshot> supervisorSink,
        BooleanSupplier cancelled
    ) throws Exception {
        SupervisorState state = new SupervisorState(taskId);
        AtomicBoolean primaryFailed = new AtomicBoolean(false);
        AtomicBoolean reviewerFailed = new AtomicBoolean(false);
        AtomicBoolean timedOut = new AtomicBoolean(false);

        AiEngine engine = engineRegistry.require(AiEngineKind.OPENAI_CODEX);
        try (var scope = StructuredTaskScope.<TaskSideResult>open()) {
            var primary = scope.fork(() -> executeSide(
                engine,
                SupervisorRole.PRIMARY,
                taskId,
                sessionId,
                primaryPrompt,
                state,
                progressSink,
                chunkSink,
                supervisorSink,
                cancelled,
                primaryFailed,
                reviewerFailed,
                timedOut
            ));
            var reviewer = scope.fork(() -> executeSide(
                engine,
                SupervisorRole.REVIEWER,
                taskId,
                sessionId,
                reviewerPrompt,
                state,
                progressSink,
                chunkSink,
                supervisorSink,
                cancelled,
                reviewerFailed,
                primaryFailed,
                timedOut
            ));

            scope.join();

            TaskSideResult primaryResult = resolve(primary, SupervisorRole.PRIMARY, state, primaryFailed);
            TaskSideResult reviewerResult = resolve(reviewer, SupervisorRole.REVIEWER, state, reviewerFailed);
            if (primaryFailed.get()) {
                state.peerImpact.set("PRIMARY_FAILED");
            } else if (reviewerFailed.get()) {
                state.degraded.set(true);
                state.peerImpact.set("REVIEW_DEGRADED");
            }
            supervisorSink.accept(state.snapshot(clock.millis()));
            return new SupervisedExecutionResult(primaryResult, reviewerResult, state.snapshot(clock.millis()));
        }
    }

    private TaskSideResult executeSide(
        AiEngine engine,
        SupervisorRole role,
        String taskId,
        String sessionId,
        String prompt,
        SupervisorState state,
        Consumer<TaskProgressEvent> progressSink,
        Consumer<TaskChunkEvent> chunkSink,
        Consumer<SupervisorSnapshot> supervisorSink,
        BooleanSupplier cancelled,
        AtomicBoolean selfFailed,
        AtomicBoolean peerFailed,
        AtomicBoolean timedOut
    ) throws Exception {
        state.update(role, "RUNNING", 0.08d, recommendationFor(role, state), false);
        supervisorSink.accept(state.snapshot(clock.millis()));

        EngineExecutionResult result;
        try {
            result = engine.execute(
                new EngineExecutionRequest(
                    taskId,
                    sessionId,
                    prompt,
                    role == SupervisorRole.PRIMARY
                        ? "Primary implementation stream. Prefer concrete delivery."
                        : "Reviewer stream. Focus on defects, cost, and missing edge cases.",
                    ".",
                    Duration.ofMinutes(15),
                    () -> cancelled.getAsBoolean() || timedOut.get() || (role == SupervisorRole.REVIEWER && peerFailed.get())
                ),
                new EngineExecutionObserver() {
                    @Override
                    public void onStage(String stage, double progress, String summary) {
                        String recommendation = recommendationFor(role, state);
                        state.update(role, "RUNNING", progress, recommendation, peerFailed.get());
                        progressSink.accept(new TaskProgressEvent(
                            taskId,
                            sessionId,
                            "PROCESSING",
                            role.name().toLowerCase() + ":" + stage,
                            progress,
                            summary,
                            state.peerImpact.get(),
                            recommendation,
                            clock.millis()
                        ));
                        supervisorSink.accept(state.snapshot(clock.millis()));
                    }

                    @Override
                    public void onChunk(String chunk) {
                        chunkSink.accept(new TaskChunkEvent(
                            taskId,
                            sessionId,
                            role.name().toLowerCase(),
                            chunk,
                            false,
                            clock.millis()
                        ));
                        state.bump(role, 0.04d);
                        supervisorSink.accept(state.snapshot(clock.millis()));
                    }

                    @Override
                    public boolean isCancelled() {
                        return cancelled.getAsBoolean() || timedOut.get() || (role == SupervisorRole.REVIEWER && peerFailed.get());
                    }
                }
            );
        } catch (Exception exception) {
            selfFailed.set(true);
            state.peerImpact.set(role == SupervisorRole.PRIMARY ? "PRIMARY_FAILED" : "REVIEW_DEGRADED");
            state.update(role, "FAILED", state.progress(role), recommendationFor(role, state), true);
            supervisorSink.accept(state.snapshot(clock.millis()));
            throw exception;
        }

        state.update(role, "COMPLETED", 1.0d, recommendationFor(role, state), peerFailed.get());
        supervisorSink.accept(state.snapshot(clock.millis()));
        return new TaskSideResult(role, "COMPLETED", result.content(), result.inputTokens(), result.outputTokens(), result.costUsd());
    }

    private TaskSideResult resolve(
        StructuredTaskScope.Subtask<TaskSideResult> subtask,
        SupervisorRole role,
        SupervisorState state,
        AtomicBoolean failed
    ) {
        try {
            return subtask.get();
        } catch (Exception exception) {
            failed.set(true);
            state.update(role, "FAILED", state.progress(role), recommendationFor(role, state), true);
            return new TaskSideResult(role, "FAILED", "", 0, 0, 0d);
        }
    }

    private String recommendationFor(SupervisorRole role, SupervisorState state) {
        double self = state.progress(role);
        double peer = state.progress(role == SupervisorRole.PRIMARY ? SupervisorRole.REVIEWER : SupervisorRole.PRIMARY);
        if (peer - self >= 0.25d) {
            return role == SupervisorRole.PRIMARY ? "accelerate-delivery" : "tighten-review";
        }
        if (self - peer >= 0.25d) {
            return role == SupervisorRole.PRIMARY ? "hold-quality" : "cut-to-risks";
        }
        return "balanced";
    }

    public record TaskSideResult(
        SupervisorRole role,
        String status,
        String content,
        int inputTokens,
        int outputTokens,
        double costUsd
    ) {}

    public record SupervisedExecutionResult(
        TaskSideResult primary,
        TaskSideResult reviewer,
        SupervisorSnapshot snapshot
    ) {
        public String combinedContent() {
            if ("FAILED".equals(reviewer.status())) {
                return primary.content() + "\n\n[Reviewer degraded: reviewer stream failed or timed out.]";
            }
            return primary.content() + "\n\n---\nReviewer Notes\n" + reviewer.content();
        }

        public int totalInputTokens() {
            return primary.inputTokens() + reviewer.inputTokens();
        }

        public int totalOutputTokens() {
            return primary.outputTokens() + reviewer.outputTokens();
        }

        public double totalCostUsd() {
            return primary.costUsd() + reviewer.costUsd();
        }
    }

    private static final class SupervisorState {
        private final String taskId;
        private final AtomicReference<String> primaryStatus = new AtomicReference<>("IDLE");
        private final AtomicReference<String> reviewerStatus = new AtomicReference<>("IDLE");
        private final AtomicReference<Double> primaryProgress = new AtomicReference<>(0d);
        private final AtomicReference<Double> reviewerProgress = new AtomicReference<>(0d);
        private final AtomicReference<String> primaryRecommendation = new AtomicReference<>("balanced");
        private final AtomicReference<String> reviewerRecommendation = new AtomicReference<>("balanced");
        private final AtomicBoolean degraded = new AtomicBoolean(false);
        private final AtomicReference<String> peerImpact = new AtomicReference<>("NONE");

        private SupervisorState(String taskId) {
            this.taskId = taskId;
        }

        void update(SupervisorRole role, String status, double progress, String recommendation, boolean degraded) {
            if (role == SupervisorRole.PRIMARY) {
                primaryStatus.set(status);
                primaryProgress.set(progress);
                primaryRecommendation.set(recommendation);
            } else {
                reviewerStatus.set(status);
                reviewerProgress.set(progress);
                reviewerRecommendation.set(recommendation);
            }
            if (degraded) {
                this.degraded.set(true);
            }
        }

        void bump(SupervisorRole role, double amount) {
            if (role == SupervisorRole.PRIMARY) {
                primaryProgress.updateAndGet(current -> Math.min(0.98d, current + amount));
            } else {
                reviewerProgress.updateAndGet(current -> Math.min(0.98d, current + amount));
            }
        }

        double progress(SupervisorRole role) {
            return role == SupervisorRole.PRIMARY ? primaryProgress.get() : reviewerProgress.get();
        }

        SupervisorSnapshot snapshot(long updatedAt) {
            return new SupervisorSnapshot(
                taskId,
                primaryStatus.get(),
                reviewerStatus.get(),
                primaryProgress.get(),
                reviewerProgress.get(),
                primaryRecommendation.get(),
                reviewerRecommendation.get(),
                degraded.get(),
                peerImpact.get(),
                updatedAt
            );
        }
    }
}
