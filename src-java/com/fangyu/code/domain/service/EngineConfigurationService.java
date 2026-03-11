package com.fangyu.code.domain.service;

import java.io.IOException;
import java.util.List;
import java.util.Locale;

import org.springframework.stereotype.Service;

import com.fangyu.code.config.FangyuProperties;
import com.fangyu.code.domain.model.AiEngineKind;
import com.fangyu.code.shared.dto.AppSettings;
import com.fangyu.code.shared.dto.EngineStatusSnapshot;

@Service
public class EngineConfigurationService {

    private final FangyuProperties properties;
    private final SettingsService settingsService;

    public EngineConfigurationService(FangyuProperties properties, SettingsService settingsService) {
        this.properties = properties;
        this.settingsService = settingsService;
    }

    public String claudeExecutable() {
        AppSettings settings = settingsService.load();
        return valueOrDefault(settings.claudeExecutable(), properties.getEngines().getClaude().getExecutable());
    }

    public String geminiExecutable() {
        AppSettings settings = settingsService.load();
        return valueOrDefault(settings.geminiExecutable(), properties.getEngines().getGemini().getExecutable());
    }

    public String codexEndpoint() {
        AppSettings settings = settingsService.load();
        return valueOrDefault(settings.codexEndpoint(), properties.getEngines().getCodex().getEndpoint());
    }

    public String codexModel() {
        AppSettings settings = settingsService.load();
        return valueOrDefault(settings.codexModel(), properties.getEngines().getCodex().getModel());
    }

    public String codexApiKey() {
        AppSettings settings = settingsService.load();
        return valueOrDefault(settings.codexApiKey(), properties.getEngines().getCodex().getApiKey());
    }

    public List<EngineStatusSnapshot> statuses() {
        return List.of(
            statusForClaude(),
            statusForCodex(),
            statusForGemini()
        );
    }

    private EngineStatusSnapshot statusForClaude() {
        boolean enabled = properties.getEngines().getClaude().isEnabled();
        String executable = claudeExecutable();
        boolean configured = executable != null && !executable.isBlank();
        boolean available = enabled && configured && commandExists(executable);
        String detail = !enabled
            ? "Disabled in application.yml"
            : !configured
                ? "Missing Claude executable"
                : available
                    ? "Claude CLI ready"
                    : "Executable not found on PATH";
        return new EngineStatusSnapshot(AiEngineKind.CLAUDE_CODE.name(), enabled, configured, available, detail);
    }

    private EngineStatusSnapshot statusForGemini() {
        boolean enabled = properties.getEngines().getGemini().isEnabled();
        String executable = geminiExecutable();
        boolean configured = executable != null && !executable.isBlank();
        boolean available = enabled && configured && commandExists(executable);
        String detail = !enabled
            ? "Disabled in application.yml"
            : !configured
                ? "Missing Gemini executable"
                : available
                    ? "Gemini CLI ready"
                    : "Executable not found on PATH";
        return new EngineStatusSnapshot(AiEngineKind.GEMINI.name(), enabled, configured, available, detail);
    }

    private EngineStatusSnapshot statusForCodex() {
        boolean enabled = properties.getEngines().getCodex().isEnabled();
        String endpoint = codexEndpoint();
        String model = codexModel();
        String apiKey = codexApiKey();
        boolean configured = endpoint != null && !endpoint.isBlank() && model != null && !model.isBlank() && apiKey != null && !apiKey.isBlank();
        boolean available = enabled && configured;
        String detail = !enabled
            ? "Disabled in application.yml"
            : !configured
                ? "Missing endpoint, model, or API key"
                : "Codex API ready";
        return new EngineStatusSnapshot(AiEngineKind.OPENAI_CODEX.name(), enabled, configured, available, detail);
    }

    private boolean commandExists(String executable) {
        String trimmed = executable == null ? "" : executable.trim();
        if (trimmed.isBlank()) {
            return false;
        }

        String[] command = System.getProperty("os.name", "").toLowerCase(Locale.ROOT).contains("win")
            ? new String[] { "where", trimmed }
            : new String[] { "which", trimmed };
        try {
            Process process = new ProcessBuilder(command).start();
            return process.waitFor() == 0;
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            return false;
        } catch (IOException exception) {
            return false;
        }
    }

    private String valueOrDefault(String override, String fallback) {
        return override == null || override.isBlank() ? fallback : override.strip();
    }
}
