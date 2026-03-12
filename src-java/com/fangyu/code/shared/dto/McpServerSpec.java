package com.fangyu.code.shared.dto;

import java.util.List;
import java.util.Map;

public record McpServerSpec(
    String transport,
    String command,
    List<String> args,
    String url,
    Map<String, String> env,
    Integer timeoutMs
) {}
