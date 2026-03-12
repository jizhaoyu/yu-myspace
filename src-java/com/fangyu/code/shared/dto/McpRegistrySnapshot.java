package com.fangyu.code.shared.dto;

import java.util.List;

public record McpRegistrySnapshot(
    List<McpServerEntry> servers,
    long updatedAt,
    String registryPath,
    String opencodeConfigPath
) {}
