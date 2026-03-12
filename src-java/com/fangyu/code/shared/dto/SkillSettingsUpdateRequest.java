package com.fangyu.code.shared.dto;

import java.util.List;

public record SkillSettingsUpdateRequest(
    Boolean skillsEnabled,
    List<String> disabledSkillIds,
    List<String> manualSkillIds
) {}
