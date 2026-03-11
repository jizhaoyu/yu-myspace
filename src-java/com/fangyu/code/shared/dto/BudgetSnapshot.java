package com.fangyu.code.shared.dto;

public record BudgetSnapshot(
    String sessionId,
    double currentSessionUsd,
    double weeklyUsd,
    double sessionBudgetUsd,
    double weeklyBudgetUsd,
    double sessionUsageRatio,
    double weeklyUsageRatio,
    String level
) {}
