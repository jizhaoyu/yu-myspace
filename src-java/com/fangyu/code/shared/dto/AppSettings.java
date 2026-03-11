package com.fangyu.code.shared.dto;

public record AppSettings(
    String theme,
    String defaultEngine,
    boolean autostartEnabled,
    double sessionBudgetUsd,
    double weeklyBudgetUsd
) {}
