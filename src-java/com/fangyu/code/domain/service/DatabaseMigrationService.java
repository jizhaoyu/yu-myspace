package com.fangyu.code.domain.service;

import java.util.HashSet;
import java.util.Set;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;

import jakarta.annotation.PostConstruct;

@Service
public class DatabaseMigrationService {

    private static final String PROMPT_MESSAGE_FTS_TABLE = "prompt_message_fts";
    private static final String PROMPT_MESSAGE_INSERT_TRIGGER = "trg_prompt_message_ai";
    private static final String PROMPT_MESSAGE_DELETE_TRIGGER = "trg_prompt_message_ad";
    private static final String PROMPT_MESSAGE_UPDATE_TRIGGER = "trg_prompt_message_au";

    private final JdbcClient jdbcClient;
    private final ObjectMapper objectMapper;

    public DatabaseMigrationService(JdbcClient jdbcClient, ObjectMapper objectMapper) {
        this.jdbcClient = jdbcClient;
        this.objectMapper = objectMapper;
    }

    @PostConstruct
    void migrate() {
        Set<String> columns = new HashSet<>(jdbcClient.sql("PRAGMA table_info(prompt_task)")
            .query((rs, rowNum) -> rs.getString("name"))
            .list());

        if (!columns.contains("workspace_path")) {
            jdbcClient.sql("ALTER TABLE prompt_task ADD COLUMN workspace_path TEXT").update();
        }
        if (!columns.contains("context_files_json")) {
            jdbcClient.sql("ALTER TABLE prompt_task ADD COLUMN context_files_json TEXT NOT NULL DEFAULT '[]'").update();
        }

        normalizeEngineValues();
        normalizeSettingsJson();
        ensurePromptMessageSearchObjects();
    }

    private void normalizeEngineValues() {
        jdbcClient.sql("""
            UPDATE prompt_task
            SET engine = 'OPENCODE'
            WHERE engine IS NULL
               OR TRIM(engine) = ''
               OR UPPER(TRIM(engine)) IN ('OPENAI_CODEX', 'CLAUDE_CODE', 'GEMINI')
            """).update();

        jdbcClient.sql("""
            UPDATE conversation_session
            SET active_engine = 'OPENCODE'
            WHERE active_engine IS NULL
               OR TRIM(active_engine) = ''
               OR UPPER(TRIM(active_engine)) IN ('OPENAI_CODEX', 'CLAUDE_CODE', 'GEMINI')
            """).update();
    }

    private void normalizeSettingsJson() {
        String json = jdbcClient.sql("SELECT json_value FROM app_setting WHERE setting_key = :key")
            .param("key", "app.settings")
            .query(String.class)
            .optional()
            .orElse(null);

        if (json == null || json.isBlank()) {
            return;
        }

        try {
            JsonNode root = objectMapper.readTree(json);
            if (!(root instanceof ObjectNode objectNode)) {
                return;
            }

            String defaultEngine = objectNode.path("defaultEngine").asText("").trim().toUpperCase();
            if (defaultEngine.isBlank()
                || "OPENAI_CODEX".equals(defaultEngine)
                || "CLAUDE_CODE".equals(defaultEngine)
                || "GEMINI".equals(defaultEngine)
                || "OPENCODE".equals(defaultEngine)) {
                objectNode.put("defaultEngine", "OPENCODE");
            }

            objectNode.remove("claudeExecutable");
            objectNode.remove("geminiExecutable");

            if (!objectNode.has("skillsEnabled")) {
                objectNode.put("skillsEnabled", true);
            }
            if (!objectNode.has("disabledSkillIds")) {
                objectNode.putArray("disabledSkillIds");
            }
            if (!objectNode.has("manualSkillIds")) {
                objectNode.putArray("manualSkillIds");
            }

            jdbcClient.sql("""
                UPDATE app_setting
                SET json_value = :json,
                    updated_at = CAST(strftime('%s','now') AS INTEGER) * 1000
                WHERE setting_key = :key
                """)
                .param("json", objectMapper.writeValueAsString(objectNode))
                .param("key", "app.settings")
                .update();
        } catch (Exception ignored) {
        }
    }

    private void ensurePromptMessageSearchObjects() {
        ensureFtsTable();
        ensureTrigger(
            PROMPT_MESSAGE_INSERT_TRIGGER,
            """
                CREATE TRIGGER trg_prompt_message_ai
                AFTER INSERT ON prompt_message
                BEGIN
                    INSERT INTO prompt_message_fts(message_id, session_id, task_id, role, content)
                    VALUES (new.id, new.session_id, new.task_id, new.role, new.content);
                END
                """
        );
        ensureTrigger(
            PROMPT_MESSAGE_DELETE_TRIGGER,
            """
                CREATE TRIGGER trg_prompt_message_ad
                AFTER DELETE ON prompt_message
                BEGIN
                    DELETE FROM prompt_message_fts WHERE message_id = old.id;
                END
                """
        );
        ensureTrigger(
            PROMPT_MESSAGE_UPDATE_TRIGGER,
            """
                CREATE TRIGGER trg_prompt_message_au
                AFTER UPDATE ON prompt_message
                BEGIN
                    DELETE FROM prompt_message_fts WHERE message_id = old.id;
                    INSERT INTO prompt_message_fts(message_id, session_id, task_id, role, content)
                    VALUES (new.id, new.session_id, new.task_id, new.role, new.content);
                END
                """
        );
    }

    private void ensureFtsTable() {
        if (sqliteObjectExists("table", PROMPT_MESSAGE_FTS_TABLE)) {
            return;
        }
        jdbcClient.sql("""
            CREATE VIRTUAL TABLE prompt_message_fts
            USING fts5(
                message_id UNINDEXED,
                session_id UNINDEXED,
                task_id UNINDEXED,
                role,
                content
            )
            """).update();
        jdbcClient.sql("""
            INSERT INTO prompt_message_fts(message_id, session_id, task_id, role, content)
            SELECT id, session_id, task_id, role, content
            FROM prompt_message
            """).update();
    }

    private void ensureTrigger(String name, String sql) {
        if (sqliteObjectExists("trigger", name)) {
            return;
        }
        jdbcClient.sql(sql).update();
    }

    private boolean sqliteObjectExists(String type, String name) {
        return jdbcClient.sql("""
            SELECT 1
            FROM sqlite_master
            WHERE type = :type AND name = :name
            LIMIT 1
            """)
            .param("type", type)
            .param("name", name)
            .query(Integer.class)
            .optional()
            .isPresent();
    }
}
