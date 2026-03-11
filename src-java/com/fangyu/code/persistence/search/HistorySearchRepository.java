package com.fangyu.code.persistence.search;

import java.util.List;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import com.fangyu.code.shared.dto.HistoryHit;

@Repository
public class HistorySearchRepository {

    private final JdbcClient jdbcClient;

    public HistorySearchRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    public List<HistoryHit> search(String query, int limit) {
        String sql = """
            SELECT
                session_id,
                message_id,
                role,
                snippet(prompt_message_fts, 4, '[', ']', ' ... ', 12) AS snippet,
                COALESCE(
                    (SELECT created_at FROM prompt_message WHERE id = prompt_message_fts.message_id),
                    0
                ) AS created_at
            FROM prompt_message_fts
            WHERE prompt_message_fts MATCH :query
            ORDER BY rank
            LIMIT :limit
            """;

        return jdbcClient.sql(sql)
            .param("query", query + "*")
            .param("limit", limit)
            .query((rs, rowNum) -> new HistoryHit(
                rs.getString("session_id"),
                rs.getString("message_id"),
                rs.getString("role"),
                rs.getString("snippet"),
                rs.getLong("created_at")
            ))
            .list();
    }
}
