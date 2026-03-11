package com.fangyu.code.desktop;

import java.util.List;

import org.springframework.stereotype.Component;

import com.fangyu.code.domain.model.AiEngineKind;
import com.fangyu.code.domain.service.CostTrackerService;
import com.fangyu.code.domain.service.DesktopAutostartService;
import com.fangyu.code.domain.service.HistoryService;
import com.fangyu.code.domain.service.PromptQueueManager;
import com.fangyu.code.domain.service.SettingsService;
import com.fangyu.code.shared.dto.AppSettings;
import com.fangyu.code.shared.dto.BatchPromptRequest;
import com.fangyu.code.shared.dto.BatchSubmitResult;
import com.fangyu.code.shared.dto.BootstrapSnapshot;
import com.fangyu.code.shared.dto.EditQueuedTaskRequest;
import com.fangyu.code.shared.dto.HistorySearchResult;
import com.fangyu.code.shared.dto.SubmitPromptRequest;

import build.krema.core.KremaCommand;

@Component
public class PromptCommand {

    private final PromptQueueManager queueManager;
    private final HistoryService historyService;
    private final SettingsService settingsService;
    private final CostTrackerService costTrackerService;
    private final DesktopAutostartService autostartService;
    private final DesktopEventPublisher eventPublisher;

    public PromptCommand(
        PromptQueueManager queueManager,
        HistoryService historyService,
        SettingsService settingsService,
        CostTrackerService costTrackerService,
        DesktopAutostartService autostartService,
        DesktopEventPublisher eventPublisher
    ) {
        this.queueManager = queueManager;
        this.historyService = historyService;
        this.settingsService = settingsService;
        this.costTrackerService = costTrackerService;
        this.autostartService = autostartService;
        this.eventPublisher = eventPublisher;
    }

    @KremaCommand
    public BootstrapSnapshot bootstrapState(String sessionId) {
        String resolvedSessionId = resolveSessionId(sessionId);
        return new BootstrapSnapshot(
            resolvedSessionId,
            queueManager.snapshot(),
            queueManager.tasksForSession(resolvedSessionId),
            historyService.messages(resolvedSessionId),
            historyService.recentSessions(),
            queueManager.supervisors(),
            costTrackerService.snapshot(resolvedSessionId),
            settingsService.load()
        );
    }

    @KremaCommand
    public Object submitPrompt(SubmitPromptRequest request) {
        return queueManager.submit(request);
    }

    @KremaCommand
    public BatchSubmitResult submitBatchPrompts(BatchPromptRequest request) {
        return queueManager.submitBatch(request);
    }

    @KremaCommand
    public Object editQueuedTask(EditQueuedTaskRequest request) {
        return queueManager.editQueuedTask(request);
    }

    @KremaCommand
    public Object cancelTask(String taskId) {
        return queueManager.cancel(taskId);
    }

    @KremaCommand
    public Object pauseQueue() {
        return queueManager.pauseQueue();
    }

    @KremaCommand
    public Object resumeQueue() {
        return queueManager.resumeQueue();
    }

    @KremaCommand
    public Object queueSnapshot() {
        return queueManager.snapshot();
    }

    @KremaCommand
    public HistorySearchResult searchHistory(String query, Integer limit) {
        return historyService.search(query, limit == null ? 20 : limit);
    }

    @KremaCommand
    public String exportSession(String sessionId, String outputPath) {
        return historyService.exportSession(sessionId, outputPath);
    }

    @KremaCommand
    public AppSettings updateSettings(
        String theme,
        String defaultEngine,
        boolean autostartEnabled,
        Double sessionBudgetUsd,
        Double weeklyBudgetUsd
    ) {
        AppSettings current = settingsService.load();
        AppSettings next = new AppSettings(
            theme == null || theme.isBlank() ? current.theme() : theme,
            defaultEngine == null || defaultEngine.isBlank() ? current.defaultEngine() : AiEngineKind.from(defaultEngine).name(),
            autostartEnabled,
            sessionBudgetUsd == null ? current.sessionBudgetUsd() : sessionBudgetUsd,
            weeklyBudgetUsd == null ? current.weeklyBudgetUsd() : weeklyBudgetUsd
        );
        AppSettings updated = settingsService.update(next);
        autostartService.apply(updated.autostartEnabled());
        eventPublisher.emit(DesktopEventPublisher.SETTINGS_UPDATED, updated);
        return updated;
    }

    private String resolveSessionId(String requestedSessionId) {
        if (requestedSessionId != null && !requestedSessionId.isBlank()) {
            return historyService.ensureSession(requestedSessionId, AiEngineKind.OPENAI_CODEX).id();
        }
        List<com.fangyu.code.shared.dto.ConversationSessionView> sessions = historyService.recentSessions();
        if (!sessions.isEmpty()) {
            return sessions.getFirst().id();
        }
        return historyService.ensureSession(null, AiEngineKind.OPENAI_CODEX).id();
    }
}
