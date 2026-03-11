package com.fangyu.code.persistence.repository;

import java.util.List;

import org.springframework.data.repository.CrudRepository;

import com.fangyu.code.persistence.entity.PromptTaskEntity;

public interface PromptTaskRepository extends CrudRepository<PromptTaskEntity, String> {
    List<PromptTaskEntity> findTop100BySessionIdOrderByCreatedAtDesc(String sessionId);
    List<PromptTaskEntity> findTop100ByOrderByCreatedAtDesc();
}
