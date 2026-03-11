package com.fangyu.code.shared.dto;

import java.util.List;

public record HistorySearchResult(
    String query,
    List<HistoryHit> hits
) {}
