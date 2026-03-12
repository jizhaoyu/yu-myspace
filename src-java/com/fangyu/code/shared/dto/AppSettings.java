package com.fangyu.code.shared.dto;

import java.util.List;

public record AppSettings(
    String theme,
    String defaultEngine,
    boolean autostartEnabled,
    double sessionBudgetUsd,
    double weeklyBudgetUsd,
    String codexEndpoint,
    String codexModel,
    String codexApiKey,
    boolean skillsEnabled,
    List<String> disabledSkillIds,
    List<String> manualSkillIds
) {}
