package com.fangyu.code.persistence.repository;

import java.util.List;

import org.springframework.data.repository.CrudRepository;

import com.fangyu.code.persistence.entity.ConversationSessionEntity;

public interface ConversationSessionRepository extends CrudRepository<ConversationSessionEntity, String> {
    List<ConversationSessionEntity> findTop20ByOrderByUpdatedAtDesc();
}
