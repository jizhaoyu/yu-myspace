package com.fangyu.code.shared.dto;

public record SkillDefinitionView(
    String id,
    String name,
    String description,
    String path,
    boolean enabled
) {}
