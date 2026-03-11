package com.fangyu.code.shared.dto;

public record AppSettings(
    String theme,
    String defaultEngine,
    boolean autostartEnabled,
    double sessionBudgetUsd,
    double weeklyBudgetUsd,
    String claudeExecutable,
    String geminiExecutable,
    String codexEndpoint,
    String codexModel,
    String codexApiKey
) {}
