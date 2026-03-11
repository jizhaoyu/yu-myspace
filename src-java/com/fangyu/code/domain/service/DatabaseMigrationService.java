package com.fangyu.code.domain.service;

import java.util.HashSet;
import java.util.Set;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;

@Service
public class DatabaseMigrationService {

    private final JdbcClient jdbcClient;

    public DatabaseMigrationService(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
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
    }
}
