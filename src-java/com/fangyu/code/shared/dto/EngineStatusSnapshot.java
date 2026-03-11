package com.fangyu.code.shared.dto;

public record EngineStatusSnapshot(
    String engine,
    boolean enabled,
    boolean configured,
    boolean available,
    String detail
) {}
