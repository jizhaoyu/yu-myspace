package com.fangyu.code.domain.service;

import java.util.List;

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

    public int timeoutSeconds() {
        return properties.getEngines().getCodex().getTimeoutSeconds();
    }

    public List<EngineStatusSnapshot> statuses() {
        return List.of(statusForCodex());
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
        return new EngineStatusSnapshot(AiEngineKind.OPENCODE.name(), enabled, configured, available, detail);
    }

    private String valueOrDefault(String override, String fallback) {
        return override == null || override.isBlank() ? fallback : override.strip();
    }
}
