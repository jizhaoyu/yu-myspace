package com.fangyu.code.domain.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Files;
import java.nio.file.Path;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import com.fasterxml.jackson.databind.ObjectMapper;

class SkillRegistryTest {

    @AfterEach
    void clearProperty() {
        System.clearProperty("codex.home");
    }

    @Test
    void shouldLoadSkillsFromDynamicCodexHome() throws Exception {
        Path codexHome = Files.createTempDirectory("fangyu-codex-skills-");
        Path skillDir = Files.createDirectories(codexHome.resolve("skills").resolve("global-test-skill"));
        Files.writeString(
            skillDir.resolve("SKILL.md"),
            """
            ---
            name: global-test-skill
            description: loaded from codex home
            ---

            # Global Test Skill
            """
        );
        System.setProperty("codex.home", codexHome.toString());

        SkillRegistry registry = new SkillRegistry(
            new SkillParser(),
            new CodexExternalConfigService(new ObjectMapper())
        );

        assertThat(registry.listAll())
            .extracting(SkillRegistry.SkillDefinition::id)
            .contains("global-test-skill");
    }
}
