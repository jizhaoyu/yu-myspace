package com.fangyu.code.shared.dto;

import java.util.List;

public record BootstrapSnapshot(
    String sessionId,
    QueueSnapshot queue,
    List<PromptTaskSnapshot> tasks,
    List<PromptMessageView> messages,
    List<ConversationSessionView> sessions,
    List<SupervisorSnapshot> supervisors,
    BudgetSnapshot budget,
    AppSettings settings
) {}
