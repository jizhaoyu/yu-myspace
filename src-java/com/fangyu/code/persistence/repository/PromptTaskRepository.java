package com.fangyu.code.persistence.repository;

import java.util.List;

import org.springframework.data.jdbc.repository.query.Query;
import org.springframework.data.repository.CrudRepository;

import com.fangyu.code.persistence.entity.PromptTaskEntity;

public interface PromptTaskRepository extends CrudRepository<PromptTaskEntity, String> {
    @Query("""
        SELECT id, session_id, prompt, workspace_path, context_files_json, status, engine, priority,
               insert_mode, dual_mode, queue_sequence, created_at, updated_at, started_at,
               completed_at, error_message, estimated_input_tokens, estimated_output_tokens, cost_usd
        FROM prompt_task
        WHERE session_id = :sessionId
        ORDER BY created_at DESC
        LIMIT 100
        """)
    List<PromptTaskEntity> findTop100BySessionIdOrderByCreatedAtDesc(String sessionId);

    @Query("""
        SELECT id, session_id, prompt, workspace_path, context_files_json, status, engine, priority,
               insert_mode, dual_mode, queue_sequence, created_at, updated_at, started_at,
               completed_at, error_message, estimated_input_tokens, estimated_output_tokens, cost_usd
        FROM prompt_task
        ORDER BY created_at DESC
        LIMIT 100
        """)
    List<PromptTaskEntity> findTop100ByOrderByCreatedAtDesc();
}
