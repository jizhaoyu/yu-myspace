package com.fangyu.code.persistence.repository;

import java.util.List;

import org.springframework.data.jdbc.repository.query.Query;
import org.springframework.data.repository.CrudRepository;

import com.fangyu.code.persistence.entity.ConversationSessionEntity;

public interface ConversationSessionRepository extends CrudRepository<ConversationSessionEntity, String> {
    @Query("""
        SELECT id, title, active_engine, created_at, updated_at
        FROM conversation_session
        ORDER BY updated_at DESC
        LIMIT 20
        """)
    List<ConversationSessionEntity> findTop20ByOrderByUpdatedAtDesc();
}
