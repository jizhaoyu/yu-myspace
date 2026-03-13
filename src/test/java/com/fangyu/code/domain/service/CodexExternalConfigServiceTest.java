package com.fangyu.code.domain.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Files;
import java.nio.file.Path;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import com.fasterxml.jackson.databind.ObjectMapper;

class CodexExternalConfigServiceTest {

    @AfterEach
    void clearProperty() {
        System.clearProperty("codex.home");
    }

    @Test
    void shouldResolveDynamicCodexHomeAndLoadEngineDefaults() throws Exception {
        Path codexHome = Files.createTempDirectory("fangyu-codex-home-");
        Files.writeString(
            codexHome.resolve("config.toml"),
            """
            model_provider = "crs"
            model = "gpt-5.4"

            [model_providers.crs]
            base_url = "https://example.com/openai"
            wire_api = "responses"
            """
        );
        Files.writeString(
            codexHome.resolve("auth.json"),
            """
            {"OPENAI_API_KEY":"sk-test"}
            """
        );
        System.setProperty("codex.home", codexHome.toString());

        CodexExternalConfigService service = new CodexExternalConfigService(new ObjectMapper());
        CodexExternalConfigService.ExternalEngineDefaults defaults = service.loadEngineDefaults();

        assertThat(service.codexHome()).isEqualTo(codexHome.toAbsolutePath().normalize());
        assertThat(defaults.model()).isEqualTo("gpt-5.4");
        assertThat(defaults.endpoint()).isEqualTo("https://example.com/openai/v1/responses");
        assertThat(defaults.apiKey()).isEqualTo("sk-test");
    }
}
