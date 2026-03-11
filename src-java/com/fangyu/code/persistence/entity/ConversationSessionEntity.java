package com.fangyu.code.persistence.entity;

import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;

@Table("conversation_session")
public record ConversationSessionEntity(
    @Id String id,
    String title,
    String activeEngine,
    long createdAt,
    long updatedAt
) {}
