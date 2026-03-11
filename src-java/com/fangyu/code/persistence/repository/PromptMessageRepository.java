package com.fangyu.code.persistence.repository;

import java.util.List;

import org.springframework.data.repository.CrudRepository;

import com.fangyu.code.persistence.entity.PromptMessageEntity;

public interface PromptMessageRepository extends CrudRepository<PromptMessageEntity, String> {
    List<PromptMessageEntity> findBySessionIdOrderByCreatedAtAsc(String sessionId);
}
