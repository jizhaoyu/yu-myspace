package com.fangyu.code.shared.dto;

import java.util.List;

public record SkillMatchSnapshot(
    List<String> autoMatchedSkillIds,
    List<String> manualSkillIds,
    List<String> appliedSkillIds,
    boolean injected
) {}
