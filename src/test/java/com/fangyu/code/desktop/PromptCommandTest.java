package com.fangyu.code.desktop;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import com.fangyu.code.domain.service.CostTrackerService;
import com.fangyu.code.domain.service.DesktopAutostartService;
import com.fangyu.code.domain.service.DesktopFileDialogService;
import com.fangyu.code.domain.service.DesktopNativeService;
import com.fangyu.code.domain.service.EngineConfigurationService;
import com.fangyu.code.domain.service.HistoryService;
import com.fangyu.code.domain.service.McpRegistryService;
import com.fangyu.code.domain.service.PromptQueueManager;
import com.fangyu.code.domain.service.SettingsService;
import com.fangyu.code.domain.service.SkillService;
import com.fangyu.code.shared.dto.AppSettings;
import com.fangyu.code.shared.dto.UpdateSettingsRequest;

class PromptCommandTest {

    @Mock
    private PromptQueueManager queueManager;
    @Mock
    private HistoryService historyService;
    @Mock
    private SettingsService settingsService;
    @Mock
    private CostTrackerService costTrackerService;
    @Mock
    private DesktopAutostartService autostartService;
    @Mock
    private DesktopFileDialogService fileDialogService;
    @Mock
    private DesktopNativeService desktopNativeService;
    @Mock
    private EngineConfigurationService engineConfigurationService;
    @Mock
    private SkillService skillService;
    @Mock
    private McpRegistryService mcpRegistryService;
    @Mock
    private DesktopEventPublisher eventPublisher;

    private PromptCommand promptCommand;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        promptCommand = new PromptCommand(
            queueManager,
            historyService,
            settingsService,
            costTrackerService,
            autostartService,
            fileDialogService,
            desktopNativeService,
            engineConfigurationService,
            skillService,
            mcpRegistryService,
            eventPublisher
        );
    }

    @Test
    void updateSettingsShouldClampBudgetAndTrimConfigFields() {
        AppSettings current = new AppSettings(
            "system",
            "OPENCODE",
            false,
            10d,
            20d,
            "https://api.openai.com/v1/responses",
            "gpt-5-codex",
            "sk-old",
            true,
            java.util.List.of(),
            java.util.List.of()
        );
        when(settingsService.load()).thenReturn(current);
        when(settingsService.update(any())).thenAnswer(invocation -> invocation.getArgument(0));

        UpdateSettingsRequest request = new UpdateSettingsRequest(
            "dark",
            "opencode",
            true,
            -1d,
            -5d,
            "  https://example.com/v1/responses  ",
            "  gpt-5.3-codex  ",
            "  sk-new  ",
            true,
            java.util.List.of("foo"),
            java.util.List.of("bar")
        );

        AppSettings updated = promptCommand.updateSettings(request);

        assertThat(updated.theme()).isEqualTo("dark");
        assertThat(updated.defaultEngine()).isEqualTo("OPENCODE");
        assertThat(updated.autostartEnabled()).isTrue();
        assertThat(updated.sessionBudgetUsd()).isEqualTo(0d);
        assertThat(updated.weeklyBudgetUsd()).isEqualTo(0d);
        assertThat(updated.codexEndpoint()).isEqualTo("https://example.com/v1/responses");
        assertThat(updated.codexModel()).isEqualTo("gpt-5.3-codex");
        assertThat(updated.codexApiKey()).isEqualTo("sk-new");
        assertThat(updated.skillsEnabled()).isTrue();
        assertThat(updated.disabledSkillIds()).containsExactly("foo");
        assertThat(updated.manualSkillIds()).containsExactly("bar");
        verify(autostartService).apply(true);
    }
}
