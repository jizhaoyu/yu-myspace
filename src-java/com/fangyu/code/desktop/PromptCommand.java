package com.fangyu.code.desktop;

import java.util.List;
import java.util.Locale;
import java.util.Objects;

import org.springframework.stereotype.Component;

import com.fangyu.code.domain.model.AiEngineKind;
import com.fangyu.code.domain.service.CostTrackerService;
import com.fangyu.code.domain.service.DesktopFileDialogService;
import com.fangyu.code.domain.service.DesktopNativeService;
import com.fangyu.code.domain.service.DesktopAutostartService;
import com.fangyu.code.domain.service.EngineConfigurationService;
import com.fangyu.code.domain.service.HistoryService;
import com.fangyu.code.domain.service.McpRegistryService;
import com.fangyu.code.domain.service.PromptQueueManager;
import com.fangyu.code.domain.service.SettingsService;
import com.fangyu.code.domain.service.SkillService;
import com.fangyu.code.shared.dto.AppSettings;
import com.fangyu.code.shared.dto.BatchPromptRequest;
import com.fangyu.code.shared.dto.BatchSubmitResult;
import com.fangyu.code.shared.dto.BootstrapSnapshot;
import com.fangyu.code.shared.dto.EditQueuedTaskRequest;
import com.fangyu.code.shared.dto.EngineStatusSnapshot;
import com.fangyu.code.shared.dto.HistorySearchResult;
import com.fangyu.code.shared.dto.MoveQueuedTaskRequest;
import com.fangyu.code.shared.dto.McpRegistrySnapshot;
import com.fangyu.code.shared.dto.McpUpsertRequest;
import com.fangyu.code.shared.dto.SubmitPromptRequest;
import com.fangyu.code.shared.dto.SkillDefinitionView;
import com.fangyu.code.shared.dto.SkillMatchSnapshot;
import com.fangyu.code.shared.dto.SkillSettingsUpdateRequest;
import com.fangyu.code.shared.dto.UpdateSettingsRequest;

import build.krema.core.KremaCommand;

@Component
public class PromptCommand {

    private final PromptQueueManager queueManager;
    private final HistoryService historyService;
    private final SettingsService settingsService;
    private final CostTrackerService costTrackerService;
    private final DesktopAutostartService autostartService;
    private final DesktopFileDialogService fileDialogService;
    private final DesktopNativeService desktopNativeService;
    private final EngineConfigurationService engineConfigurationService;
    private final SkillService skillService;
    private final McpRegistryService mcpRegistryService;
    private final DesktopEventPublisher eventPublisher;

    public PromptCommand(
        PromptQueueManager queueManager,
        HistoryService historyService,
        SettingsService settingsService,
        CostTrackerService costTrackerService,
        DesktopAutostartService autostartService,
        DesktopFileDialogService fileDialogService,
        DesktopNativeService desktopNativeService,
        EngineConfigurationService engineConfigurationService,
        SkillService skillService,
        McpRegistryService mcpRegistryService,
        DesktopEventPublisher eventPublisher
    ) {
        this.queueManager = queueManager;
        this.historyService = historyService;
        this.settingsService = settingsService;
        this.costTrackerService = costTrackerService;
        this.autostartService = autostartService;
        this.fileDialogService = fileDialogService;
        this.desktopNativeService = desktopNativeService;
        this.engineConfigurationService = engineConfigurationService;
        this.skillService = skillService;
        this.mcpRegistryService = mcpRegistryService;
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
            settingsService.load(),
            engineConfigurationService.statuses()
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
    public Object retryTask(String taskId) {
        return queueManager.retry(taskId);
    }

    @KremaCommand
    public Object duplicateTask(String taskId) {
        return queueManager.duplicate(taskId);
    }

    @KremaCommand
    public Object moveQueuedTask(MoveQueuedTaskRequest request) {
        return queueManager.moveQueuedTask(request);
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
    public String chooseWorkspaceDirectory() {
        return fileDialogService.chooseWorkspaceDirectory();
    }

    @KremaCommand
    public List<String> chooseContextFiles() {
        return fileDialogService.chooseContextFiles();
    }

    @KremaCommand
    public String copyToClipboard(String text) {
        desktopNativeService.copyToClipboard(text);
        return "ok";
    }

    @KremaCommand
    public String readClipboardText() {
        return desktopNativeService.readClipboardText();
    }

    @KremaCommand
    public String openPath(String path) {
        return desktopNativeService.openPath(path);
    }

    @KremaCommand
    public String openLogsDirectory() {
        return desktopNativeService.openLogsDirectory();
    }

    @KremaCommand
    public String notifyUser(String title, String body) {
        desktopNativeService.notifyUser(title, body);
        return "ok";
    }

    @KremaCommand
    public List<EngineStatusSnapshot> engineStatuses() {
        return engineConfigurationService.statuses();
    }

    @KremaCommand
    public AppSettings updateSettings(UpdateSettingsRequest request) {
        Objects.requireNonNull(request, "request");
        AppSettings current = settingsService.load();
        double sessionBudget = request.sessionBudgetUsd() == null
            ? current.sessionBudgetUsd()
            : Math.max(0d, request.sessionBudgetUsd());
        double weeklyBudget = request.weeklyBudgetUsd() == null
            ? current.weeklyBudgetUsd()
            : Math.max(0d, request.weeklyBudgetUsd());

        AppSettings next = new AppSettings(
            request.theme() == null || request.theme().isBlank() ? current.theme() : request.theme(),
            request.defaultEngine() == null || request.defaultEngine().isBlank()
                ? current.defaultEngine()
                : AiEngineKind.from(request.defaultEngine()).name(),
            request.autostartEnabled(),
            sessionBudget,
            weeklyBudget,
            request.codexEndpoint() == null ? current.codexEndpoint() : request.codexEndpoint().strip(),
            request.codexModel() == null ? current.codexModel() : request.codexModel().strip(),
            request.codexApiKey() == null ? current.codexApiKey() : request.codexApiKey().strip(),
            request.skillsEnabled() == null ? current.skillsEnabled() : request.skillsEnabled(),
            request.disabledSkillIds() == null ? current.disabledSkillIds() : normalizeSkillIds(request.disabledSkillIds()),
            request.manualSkillIds() == null ? current.manualSkillIds() : normalizeSkillIds(request.manualSkillIds())
        );
        AppSettings updated = settingsService.update(next);
        autostartService.apply(updated.autostartEnabled());
        eventPublisher.emit(DesktopEventPublisher.SETTINGS_UPDATED, updated);
        return updated;
    }

    @KremaCommand
    public List<SkillDefinitionView> listSkills() {
        return skillService.listSkills();
    }

    @KremaCommand
    public List<SkillDefinitionView> refreshSkills() {
        return skillService.refreshSkills();
    }

    @KremaCommand
    public SkillMatchSnapshot previewSkillMatch(String prompt) {
        return skillService.matchSnapshot(prompt == null ? "" : prompt);
    }

    @KremaCommand
    public AppSettings updateSkillSettings(SkillSettingsUpdateRequest request) {
        AppSettings updated = skillService.updateSkillSettings(request);
        eventPublisher.emit(DesktopEventPublisher.SETTINGS_UPDATED, updated);
        return updated;
    }

    @KremaCommand
    public McpRegistrySnapshot listMcpServers() {
        return mcpRegistryService.snapshot();
    }

    @KremaCommand
    public McpRegistrySnapshot upsertMcpServer(McpUpsertRequest request) {
        McpRegistrySnapshot snapshot = mcpRegistryService.upsert(request);
        eventPublisher.emit(DesktopEventPublisher.MCP_UPDATED, snapshot);
        return snapshot;
    }

    @KremaCommand
    public McpRegistrySnapshot deleteMcpServer(String id) {
        McpRegistrySnapshot snapshot = mcpRegistryService.delete(id);
        eventPublisher.emit(DesktopEventPublisher.MCP_UPDATED, snapshot);
        return snapshot;
    }

    @KremaCommand
    public McpRegistrySnapshot setMcpServerEnabled(String id, boolean enabled) {
        McpRegistrySnapshot snapshot = mcpRegistryService.setEnabled(id, enabled);
        eventPublisher.emit(DesktopEventPublisher.MCP_UPDATED, snapshot);
        return snapshot;
    }

    @KremaCommand
    public McpRegistrySnapshot syncMcpToOpenCode() {
        McpRegistrySnapshot snapshot = mcpRegistryService.syncToOpenCode();
        eventPublisher.emit(DesktopEventPublisher.MCP_UPDATED, snapshot);
        return snapshot;
    }

    @KremaCommand
    public McpRegistrySnapshot importMcpFromOpenCode() {
        McpRegistrySnapshot snapshot = mcpRegistryService.importFromOpenCode();
        eventPublisher.emit(DesktopEventPublisher.MCP_UPDATED, snapshot);
        return snapshot;
    }

    private List<String> normalizeSkillIds(List<String> skillIds) {
        if (skillIds == null) {
            return List.of();
        }
        return skillIds.stream()
            .filter(id -> id != null && !id.isBlank())
            .map(String::strip)
            .map(id -> id.toLowerCase(Locale.ROOT))
            .distinct()
            .toList();
    }

    private String resolveSessionId(String requestedSessionId) {
        if (requestedSessionId != null && !requestedSessionId.isBlank()) {
            return historyService.ensureSession(requestedSessionId, AiEngineKind.OPENCODE).id();
        }
        List<com.fangyu.code.shared.dto.ConversationSessionView> sessions = historyService.recentSessions();
        if (!sessions.isEmpty()) {
            return sessions.getFirst().id();
        }
        return historyService.ensureSession(null, AiEngineKind.OPENCODE).id();
    }
}
