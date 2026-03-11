package com.fangyu.code.shared.dto;

public record ConversationSessionView(
    String id,
    String title,
    String activeEngine,
    long createdAt,
    long updatedAt
) {}
