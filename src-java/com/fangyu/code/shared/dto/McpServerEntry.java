package com.fangyu.code.shared.dto;

import java.util.List;

public record McpServerEntry(
    String id,
    String name,
    McpServerSpec spec,
    boolean enabled,
    List<String> targetApps,
    String description,
    List<String> tags,
    long updatedAt
) {}
