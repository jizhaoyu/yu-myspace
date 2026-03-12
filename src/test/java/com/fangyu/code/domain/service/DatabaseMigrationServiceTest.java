package com.fangyu.code.domain.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;

import javax.sql.DataSource;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

class DatabaseMigrationServiceTest {

    private JdbcClient jdbcClient;
    private DatabaseMigrationService migrationService;

    @BeforeEach
    void setUp() throws Exception {
        Path databasePath = Files.createTempFile("fangyu-migration-test-", ".db");
        DataSource dataSource = new DriverManagerDataSource("jdbc:sqlite:" + databasePath.toAbsolutePath());
        jdbcClient = JdbcClient.create(dataSource);
        migrationService = new DatabaseMigrationService(jdbcClient, new ObjectMapper());

        jdbcClient.sql("""
            CREATE TABLE prompt_task (
                id TEXT PRIMARY KEY,
                engine TEXT
            )
            """).update();
        jdbcClient.sql("""
            CREATE TABLE conversation_session (
                id TEXT PRIMARY KEY,
                active_engine TEXT
            )
            """).update();
        jdbcClient.sql("""
            CREATE TABLE app_setting (
                setting_key TEXT PRIMARY KEY,
                json_value TEXT NOT NULL,
                updated_at INTEGER NOT NULL
            )
            """).update();
    }

    @Test
    void migrateShouldNormalizeLegacyEnginesAndSettings() throws Exception {
        jdbcClient.sql("INSERT INTO prompt_task(id, engine) VALUES ('t1', 'OPENAI_CODEX')").update();
        jdbcClient.sql("INSERT INTO prompt_task(id, engine) VALUES ('t2', 'GEMINI')").update();
        jdbcClient.sql("INSERT INTO conversation_session(id, active_engine) VALUES ('s1', 'CLAUDE_CODE')").update();
        jdbcClient.sql("""
            INSERT INTO app_setting(setting_key, json_value, updated_at)
            VALUES ('app.settings',
                    '{"defaultEngine":"OPENAI_CODEX","claudeExecutable":"claude","geminiExecutable":"gemini"}',
                    1)
            """).update();

        migrationService.migrate();

        String firstTaskEngine = jdbcClient.sql("SELECT engine FROM prompt_task WHERE id = 't1'")
            .query(String.class)
            .single();
        String secondTaskEngine = jdbcClient.sql("SELECT engine FROM prompt_task WHERE id = 't2'")
            .query(String.class)
            .single();
        String sessionEngine = jdbcClient.sql("SELECT active_engine FROM conversation_session WHERE id = 's1'")
            .query(String.class)
            .single();

        assertThat(firstTaskEngine).isEqualTo("OPENCODE");
        assertThat(secondTaskEngine).isEqualTo("OPENCODE");
        assertThat(sessionEngine).isEqualTo("OPENCODE");

        String settingsJson = jdbcClient.sql("SELECT json_value FROM app_setting WHERE setting_key = 'app.settings'")
            .query(String.class)
            .single();
        Map<String, Object> settings = new ObjectMapper().readValue(settingsJson, new TypeReference<Map<String, Object>>() {});
        assertThat(settings.get("defaultEngine")).isEqualTo("OPENCODE");
        assertThat(settings).doesNotContainKeys("claudeExecutable", "geminiExecutable");
    }

    @Test
    void migrateShouldAddMissingContextColumns() {
        migrationService.migrate();

        var columns = jdbcClient.sql("PRAGMA table_info(prompt_task)")
            .query((rs, rowNum) -> rs.getString("name"))
            .list();

        assertThat(columns).contains("workspace_path", "context_files_json");
    }
}
