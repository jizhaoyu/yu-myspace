package com.fangyu.code.shared.dto;

import java.util.List;

public record McpUpsertRequest(
    String id,
    String name,
    McpServerSpec spec,
    Boolean enabled,
    List<String> targetApps,
    String description,
    List<String> tags
) {}
