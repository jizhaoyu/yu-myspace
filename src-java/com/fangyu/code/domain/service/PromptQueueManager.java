package com.fangyu.code.domain.service;

import java.time.Clock;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CancellationException;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Future;
import java.util.concurrent.PriorityBlockingQueue;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

import org.springframework.stereotype.Service;

import com.fangyu.code.config.FangyuProperties;
import com.fangyu.code.desktop.DesktopEventPublisher;
import com.fangyu.code.domain.model.AiEngineKind;
import com.fangyu.code.domain.model.PromptTaskStatus;
import com.fangyu.code.domain.model.QueuedPromptTask;
import com.fangyu.code.persistence.entity.PromptTaskEntity;
import com.fangyu.code.persistence.repository.PromptTaskRepository;
import com.fangyu.code.shared.dto.BatchPromptRequest;
import com.fangyu.code.shared.dto.BatchSubmitResult;
import com.fangyu.code.shared.dto.EditQueuedTaskRequest;
import com.fangyu.code.shared.dto.PromptTaskSnapshot;
import com.fangyu.code.shared.dto.QueueSnapshot;
import com.fangyu.code.shared.dto.SubmitPromptRequest;
import com.fangyu.code.shared.dto.SupervisorSnapshot;
import com.fangyu.code.shared.dto.TaskProgressEvent;

@Service
public class PromptQueueManager {

    private final PriorityBlockingQueue<QueueEntry> queue = new PriorityBlockingQueue<>(32, QueueEntry.ORDERING);
    private final Map<String, ManagedTask> tasks = new ConcurrentHashMap<>();
    private final Map<String, SupervisorSnapshot> supervisors = new ConcurrentHashMap<>();
    private final AtomicReference<String> activeTaskId = new AtomicReference<>();
    private final AtomicInteger sequence = new AtomicInteger();
    private final AtomicBoolean paused = new AtomicBoolean(false);
    private final Object pauseMonitor = new Object();

    private final FangyuProperties properties;
    private final AiEngineRegistry engineRegistry;
    private final HistoryService historyService;
    private final SettingsService settingsService;
    private final CostTrackerService costTrackerService;
    private final TokenEstimator tokenEstimator;
    private final PromptExecutionService promptExecutionService;
    private final PromptTaskRepository promptTaskRepository;
    private final DesktopEventPublisher eventPublisher;
    private final ExecutorService virtualTaskExecutor;
    private final Clock clock;

    public PromptQueueManager(
        FangyuProperties properties,
        AiEngineRegistry engineRegistry,
        HistoryService historyService,
        SettingsService settingsService,
        CostTrackerService costTrackerService,
        TokenEstimator tokenEstimator,
        PromptExecutionService promptExecutionService,
        PromptTaskRepository promptTaskRepository,
        DesktopEventPublisher eventPublisher,
        ExecutorService virtualTaskExecutor,
        Clock clock
    ) {
        this.properties = properties;
        this.engineRegistry = engineRegistry;
        this.historyService = historyService;
        this.settingsService = settingsService;
        this.costTrackerService = costTrackerService;
        this.tokenEstimator = tokenEstimator;
        this.promptExecutionService = promptExecutionService;
        this.promptTaskRepository = promptTaskRepository;
        this.eventPublisher = eventPublisher;
        this.virtualTaskExecutor = virtualTaskExecutor;
        this.clock = clock;

        hydrateRecentTasks();
        Thread.ofPlatform()
            .name("fangyu-queue-dispatcher")
            .daemon(true)
            .start(this::dispatchLoop);
    }

    public PromptTaskSnapshot submit(SubmitPromptRequest request) {
        AiEngineKind engine = resolveEngine(request.engine());
        ensureQueueCapacity(1);
        String sessionId = historyService.ensureSession(request.sessionId(), engine).id();
        return enqueueTask(
            request.prompt(),
            sessionId,
            engine,
            request.priority(),
            request.insertMode(),
            request.dualMode(),
            true
        );
    }

    public BatchSubmitResult submitBatch(BatchPromptRequest request) {
        if (request.prompts() == null || request.prompts().isEmpty()) {
            throw new IllegalArgumentException("Batch prompts must not be empty");
        }

        List<String> prompts = request.prompts().stream()
            .map(String::strip)
            .filter(prompt -> !prompt.isBlank())
            .toList();
        if (prompts.isEmpty()) {
            throw new IllegalArgumentException("Batch prompts must not be empty");
        }

        AiEngineKind engine = resolveEngine(request.engine());
        ensureQueueCapacity(prompts.size());
        String sessionId = historyService.ensureSession(request.sessionId(), engine).id();

        List<String> submittedTaskIds = new ArrayList<>();
        try {
            for (String prompt : prompts) {
                PromptTaskSnapshot submittedTask = enqueueTask(
                    prompt,
                    sessionId,
                    engine,
                    request.priority(),
                    request.insertMode(),
                    false,
                    false
                );
                submittedTaskIds.add(submittedTask.id());
            }
        } catch (RuntimeException exception) {
            rollbackBatch(submittedTaskIds);
            emitQueueSnapshot();
            throw exception;
        }

        QueueSnapshot snapshot = snapshot();
        eventPublisher.emit(DesktopEventPublisher.QUEUE_SNAPSHOT, snapshot);
        return new BatchSubmitResult(sessionId, snapshot);
    }

    public PromptTaskSnapshot editQueuedTask(EditQueuedTaskRequest request) {
        ManagedTask task = requireTask(request.taskId());
        if (task.status.get() != PromptTaskStatus.QUEUED) {
            throw new IllegalStateException("Only queued tasks can be edited");
        }

        task.prompt.set(request.prompt());
        if (request.priority() != null) {
            task.priority.set(request.priority());
        }
        task.insertMode.set(request.insertMode());
        task.effectivePriority.set(task.priority.get() + (request.insertMode() ? properties.getQueue().getInsertPriorityBonus() : 0));
        queue.removeIf(entry -> entry.taskId.equals(task.id));
        queue.add(new QueueEntry(task.id, task.effectivePriority.get(), task.queueSequence));
        persist(task);
        emitQueueSnapshot();
        return task.snapshot(queuePositionOf(task.id));
    }

    public PromptTaskSnapshot cancel(String taskId) {
        ManagedTask task = requireTask(taskId);
        task.cancelRequested.set(true);
        if (task.status.get() == PromptTaskStatus.QUEUED) {
            queue.removeIf(entry -> entry.taskId.equals(taskId));
            task.status.set(PromptTaskStatus.CANCELED);
            task.stage.set("queue:canceled");
            task.progress.set(1d);
            task.completedAt.set(clock.millis());
            persist(task);
        } else if (task.status.get() == PromptTaskStatus.PROCESSING) {
            Future<?> future = task.runningFuture.get();
            if (future != null) {
                future.cancel(true);
            }
        }
        emitQueueSnapshot();
        return task.snapshot(queuePositionOf(task.id));
    }

    public QueueSnapshot pauseQueue() {
        paused.set(true);
        emitQueueSnapshot();
        return snapshot();
    }

    public QueueSnapshot resumeQueue() {
        paused.set(false);
        synchronized (pauseMonitor) {
            pauseMonitor.notifyAll();
        }
        emitQueueSnapshot();
        return snapshot();
    }

    public QueueSnapshot snapshot() {
        List<String> queueOrder = queue.stream()
            .sorted(QueueEntry.ORDERING)
            .map(entry -> entry.taskId)
            .toList();

        List<PromptTaskSnapshot> snapshots = tasks.values().stream()
            .sorted(Comparator.comparingLong(ManagedTask::createdAt).reversed())
            .map(task -> task.snapshot(queueOrder.indexOf(task.id) + 1))
            .toList();

        int processingCount = activeTaskId.get() == null ? 0 : 1;
        int queuedCount = (int) snapshots.stream().filter(task -> "QUEUED".equals(task.status())).count();
        int completedCount = (int) snapshots.stream().filter(task -> "COMPLETED".equals(task.status())).count();
        int failedCount = (int) snapshots.stream().filter(task -> "FAILED".equals(task.status())).count();

        return new QueueSnapshot(
            paused.get(),
            activeTaskId.get(),
            queuedCount,
            processingCount,
            completedCount,
            failedCount,
            snapshots
        );
    }

    public List<PromptTaskSnapshot> tasksForSession(String sessionId) {
        return tasks.values().stream()
            .filter(task -> task.sessionId.equals(sessionId))
            .sorted(Comparator.comparingLong(ManagedTask::createdAt))
            .map(task -> task.snapshot(queuePositionOf(task.id)))
            .toList();
    }

    public List<SupervisorSnapshot> supervisors() {
        return supervisors.values().stream()
            .sorted(Comparator.comparingLong(SupervisorSnapshot::updatedAt).reversed())
            .toList();
    }

    private void dispatchLoop() {
        while (true) {
            waitIfPaused();
            QueueEntry entry;
            try {
                entry = queue.take();
            } catch (InterruptedException exception) {
                Thread.currentThread().interrupt();
                return;
            }

            ManagedTask task = tasks.get(entry.taskId);
            if (task == null || task.status.get() != PromptTaskStatus.QUEUED) {
                continue;
            }

            activeTaskId.set(task.id);
            task.status.set(PromptTaskStatus.PROCESSING);
            task.stage.set("queue:dispatched");
            task.progress.set(0.05d);
            task.startedAt.compareAndSet(null, clock.millis());
            persist(task);
            emitProgress(new TaskProgressEvent(
                task.id,
                task.sessionId,
                "PROCESSING",
                task.stage.get(),
                task.progress.get(),
                "Task moved from queue to execution",
                "NONE",
                "dispatch",
                clock.millis()
            ));
            emitQueueSnapshot();

            Future<PromptExecutionService.ExecutionReport> future = virtualTaskExecutor.submit(() -> promptExecutionService.execute(
                task.toQueuedPromptTask(),
                progressEvent -> {
                    task.stage.set(progressEvent.stage());
                    task.progress.set(progressEvent.progress());
                    emitProgress(progressEvent);
                },
                chunkEvent -> eventPublisher.emit(DesktopEventPublisher.TASK_CHUNK, chunkEvent),
                supervisor -> {
                    supervisors.put(task.id, supervisor);
                    eventPublisher.emit(DesktopEventPublisher.TASK_SUPERVISION, supervisor);
                },
                task.cancelRequested::get
            ));
            task.runningFuture.set(future);

            try {
                PromptExecutionService.ExecutionReport report = future.get();
                task.status.set(PromptTaskStatus.COMPLETED);
                task.progress.set(1d);
                task.stage.set("response:complete");
                task.estimatedInputTokens.set(report.inputTokens());
                task.estimatedOutputTokens.set(report.outputTokens());
                task.costUsd.set(report.costUsd());
                task.completedAt.set(clock.millis());
                persist(task);
            } catch (CancellationException | InterruptedException exception) {
                task.status.set(PromptTaskStatus.CANCELED);
                task.stage.set("task:canceled");
                task.progress.set(1d);
                task.completedAt.set(clock.millis());
                persist(task);
            } catch (ExecutionException exception) {
                Throwable cause = exception.getCause() == null ? exception : exception.getCause();
                if (task.cancelRequested.get()) {
                    task.status.set(PromptTaskStatus.CANCELED);
                    task.stage.set("task:canceled");
                } else {
                    task.status.set(PromptTaskStatus.FAILED);
                    task.stage.set("task:failed");
                    task.errorMessage.set(cause.getMessage());
                }
                task.progress.set(1d);
                task.completedAt.set(clock.millis());
                persist(task);
            } finally {
                task.runningFuture.set(null);
                activeTaskId.set(null);
                eventPublisher.emit(DesktopEventPublisher.BUDGET_UPDATED, costTrackerService.snapshot(task.sessionId));
                emitQueueSnapshot();
            }
        }
    }

    private void waitIfPaused() {
        synchronized (pauseMonitor) {
            while (paused.get()) {
                try {
                    pauseMonitor.wait();
                } catch (InterruptedException exception) {
                    Thread.currentThread().interrupt();
                    return;
                }
            }
        }
    }

    private ManagedTask requireTask(String taskId) {
        ManagedTask task = tasks.get(taskId);
        if (task == null) {
            throw new IllegalArgumentException("Unknown task: " + taskId);
        }
        return task;
    }

    private AiEngineKind resolveEngine(String requestedEngine) {
        return requestedEngine == null || requestedEngine.isBlank()
            ? settingsDefaultEngine()
            : AiEngineKind.from(requestedEngine);
    }

    private void ensureQueueCapacity(int additionalQueuedTasks) {
        int queuedCount = (int) tasks.values().stream()
            .filter(task -> task.status.get() == PromptTaskStatus.QUEUED)
            .count();
        if (queuedCount + additionalQueuedTasks > properties.getQueue().getMaxWaitingTasks()) {
            throw new IllegalStateException("Queue is full");
        }
    }

    private PromptTaskSnapshot enqueueTask(
        String prompt,
        String sessionId,
        AiEngineKind engine,
        Integer requestedPriority,
        boolean insertMode,
        boolean dualMode,
        boolean emitQueueSnapshot
    ) {
        String taskId = UUID.randomUUID().toString();
        int priority = requestedPriority == null ? properties.getQueue().getDefaultPriority() : requestedPriority;
        int effectivePriority = priority + (insertMode ? properties.getQueue().getInsertPriorityBonus() : 0);
        long now = clock.millis();

        ManagedTask managedTask = new ManagedTask(
            taskId,
            sessionId,
            prompt,
            engine,
            priority,
            effectivePriority,
            insertMode,
            dualMode,
            sequence.incrementAndGet(),
            now
        );
        tasks.put(taskId, managedTask);
        queue.add(new QueueEntry(taskId, managedTask.effectivePriority.get(), managedTask.queueSequence));
        persist(managedTask);
        if (emitQueueSnapshot) {
            emitQueueSnapshot();
        }
        return managedTask.snapshot(queuePositionOf(taskId));
    }

    private void rollbackBatch(List<String> submittedTaskIds) {
        if (submittedTaskIds.isEmpty()) {
            return;
        }
        submittedTaskIds.forEach(taskId -> {
            tasks.remove(taskId);
            promptTaskRepository.deleteById(taskId);
        });
        queue.removeIf(entry -> submittedTaskIds.contains(entry.taskId));
    }

    private void persist(ManagedTask task) {
        promptTaskRepository.save(new PromptTaskEntity(
            task.id,
            task.sessionId,
            task.prompt.get(),
            task.status.get().name(),
            task.engine.name(),
            task.priority.get(),
            task.insertMode.get(),
            task.dualMode,
            task.queueSequence,
            task.createdAt,
            clock.millis(),
            task.startedAt.get(),
            task.completedAt.get(),
            task.errorMessage.get(),
            task.estimatedInputTokens.get(),
            task.estimatedOutputTokens.get(),
            task.costUsd.get()
        ));
    }

    private void emitProgress(TaskProgressEvent progressEvent) {
        eventPublisher.emit(DesktopEventPublisher.TASK_PROGRESS, progressEvent);
        emitQueueSnapshot();
    }

    private void emitQueueSnapshot() {
        eventPublisher.emit(DesktopEventPublisher.QUEUE_SNAPSHOT, snapshot());
    }

    private int queuePositionOf(String taskId) {
        List<String> order = queue.stream()
            .sorted(QueueEntry.ORDERING)
            .map(entry -> entry.taskId)
            .toList();
        int index = order.indexOf(taskId);
        return index < 0 ? 0 : index + 1;
    }

    private void hydrateRecentTasks() {
        promptTaskRepository.findTop100ByOrderByCreatedAtDesc().forEach(entity -> {
            ManagedTask task = new ManagedTask(
                entity.id(),
                entity.sessionId(),
                entity.prompt(),
                AiEngineKind.from(entity.engine()),
                entity.priority(),
                entity.priority() + (entity.insertMode() ? properties.getQueue().getInsertPriorityBonus() : 0),
                entity.insertMode(),
                entity.dualMode(),
                entity.queueSequence(),
                entity.createdAt()
            );
            task.status.set(PromptTaskStatus.valueOf(entity.status()));
            task.stage.set(switch (task.status.get()) {
                case COMPLETED -> "response:complete";
                case FAILED -> "task:failed";
                case CANCELED -> "task:canceled";
                case PROCESSING -> "recovered:interrupted";
                case QUEUED -> "recovered:queued";
                case PAUSED -> "recovered:paused";
            });
            task.progress.set(task.status.get() == PromptTaskStatus.COMPLETED ? 1d : 0d);
            task.startedAt.set(entity.startedAt());
            task.completedAt.set(entity.completedAt());
            task.errorMessage.set(entity.errorMessage());
            task.estimatedInputTokens.set(entity.estimatedInputTokens());
            task.estimatedOutputTokens.set(entity.estimatedOutputTokens());
            task.costUsd.set(entity.costUsd());
            if (task.status.get() == PromptTaskStatus.PROCESSING || task.status.get() == PromptTaskStatus.QUEUED) {
                task.status.set(PromptTaskStatus.CANCELED);
                task.stage.set("recovered:canceled");
                task.completedAt.set(clock.millis());
                persist(task);
            }
            tasks.put(task.id, task);
        });
    }

    private AiEngineKind settingsDefaultEngine() {
        return AiEngineKind.from(settingsService.load().defaultEngine());
    }

    private static final class QueueEntry {
        private static final Comparator<QueueEntry> ORDERING = Comparator
            .comparingInt(QueueEntry::priority).reversed()
            .thenComparingInt(QueueEntry::sequence);

        private final String taskId;
        private final int priority;
        private final int sequence;

        private QueueEntry(String taskId, int priority, int sequence) {
            this.taskId = taskId;
            this.priority = priority;
            this.sequence = sequence;
        }

        private int priority() {
            return priority;
        }

        private int sequence() {
            return sequence;
        }
    }

    private final class ManagedTask {
        private final String id;
        private final String sessionId;
        private final AiEngineKind engine;
        private final boolean dualMode;
        private final int queueSequence;
        private final long createdAt;
        private final AtomicReference<String> prompt = new AtomicReference<>();
        private final AtomicReference<PromptTaskStatus> status = new AtomicReference<>(PromptTaskStatus.QUEUED);
        private final AtomicReference<Integer> priority = new AtomicReference<>();
        private final AtomicReference<Integer> effectivePriority = new AtomicReference<>();
        private final AtomicReference<Boolean> insertMode = new AtomicReference<>(false);
        private final AtomicReference<String> stage = new AtomicReference<>("queue:waiting");
        private final AtomicReference<Double> progress = new AtomicReference<>(0d);
        private final AtomicReference<String> errorMessage = new AtomicReference<>(null);
        private final AtomicReference<Integer> estimatedInputTokens = new AtomicReference<>(0);
        private final AtomicReference<Integer> estimatedOutputTokens = new AtomicReference<>(0);
        private final AtomicReference<Double> costUsd = new AtomicReference<>(0d);
        private final AtomicReference<Long> startedAt = new AtomicReference<>(null);
        private final AtomicReference<Long> completedAt = new AtomicReference<>(null);
        private final AtomicBoolean cancelRequested = new AtomicBoolean(false);
        private final AtomicReference<Future<PromptExecutionService.ExecutionReport>> runningFuture = new AtomicReference<>(null);

        private ManagedTask(
            String id,
            String sessionId,
            String prompt,
            AiEngineKind engine,
            int priority,
            int effectivePriority,
            boolean insertMode,
            boolean dualMode,
            int queueSequence,
            long createdAt
        ) {
            this.id = id;
            this.sessionId = sessionId;
            this.engine = engine;
            this.dualMode = dualMode;
            this.queueSequence = queueSequence;
            this.createdAt = createdAt;
            this.prompt.set(prompt);
            this.priority.set(priority);
            this.effectivePriority.set(effectivePriority);
            this.insertMode.set(insertMode);
            this.estimatedInputTokens.set(tokenEstimator.estimate(prompt));
        }

        private long createdAt() {
            return createdAt;
        }

        private QueuedPromptTask toQueuedPromptTask() {
            return new QueuedPromptTask(id, sessionId, prompt.get(), engine, priority.get(), insertMode.get(), dualMode);
        }

        private PromptTaskSnapshot snapshot(int queuePosition) {
            return new PromptTaskSnapshot(
                id,
                sessionId,
                prompt.get(),
                status.get().name(),
                engine.name(),
                priority.get(),
                insertMode.get(),
                dualMode,
                queuePosition,
                createdAt,
                startedAt.get(),
                completedAt.get(),
                stage.get(),
                progress.get(),
                errorMessage.get(),
                estimatedInputTokens.get(),
                estimatedOutputTokens.get(),
                costUsd.get()
            );
        }
    }
}
