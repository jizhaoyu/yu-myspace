package com.fangyu.code.shared.dto;

import java.util.List;

public record UpdateSettingsRequest(
    String theme,
    String defaultEngine,
    boolean autostartEnabled,
    Double sessionBudgetUsd,
    Double weeklyBudgetUsd,
    String codexEndpoint,
    String codexModel,
    String codexApiKey,
    Boolean skillsEnabled,
    List<String> disabledSkillIds,
    List<String> manualSkillIds
) {}
