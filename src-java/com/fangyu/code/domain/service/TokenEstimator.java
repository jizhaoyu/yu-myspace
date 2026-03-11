package com.fangyu.code.domain.service;

import java.util.Collection;

import org.springframework.stereotype.Component;

@Component
public class TokenEstimator {

    public int estimate(String text) {
        if (text == null || text.isBlank()) {
            return 0;
        }
        return Math.max(1, (int) Math.ceil(text.length() / 4.0d));
    }

    public int estimateAll(Collection<String> texts) {
        return texts.stream().mapToInt(this::estimate).sum();
    }
}
