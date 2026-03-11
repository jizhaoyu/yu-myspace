package com.fangyu.code.domain.service;

import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Service;

import com.fangyu.code.config.FangyuProperties;
import com.fangyu.code.shared.dto.PromptMessageView;

@Service
public class ContextCompressionService {

    private final FangyuProperties properties;
    private final TokenEstimator tokenEstimator;

    public ContextCompressionService(FangyuProperties properties, TokenEstimator tokenEstimator) {
        this.properties = properties;
        this.tokenEstimator = tokenEstimator;
    }

    public ContextWindow buildWindow(List<PromptMessageView> messages) {
        int totalTokens = messages.stream().mapToInt(message -> tokenEstimator.estimate(message.content())).sum();
        if (totalTokens <= properties.getContext().getTargetTokens()) {
            return new ContextWindow(false, "", messages, totalTokens, totalTokens);
        }

        List<PromptMessageView> recent = new ArrayList<>();
        int retainedTokens = 0;
        int recentBudget = (int) (properties.getContext().getTargetTokens() * 0.6d);

        for (int index = messages.size() - 1; index >= 0; index--) {
            PromptMessageView message = messages.get(index);
            int estimated = tokenEstimator.estimate(message.content());
            if (retainedTokens + estimated > recentBudget && !recent.isEmpty()) {
                break;
            }
            recent.add(0, message);
            retainedTokens += estimated;
        }

        List<PromptMessageView> older = messages.subList(0, Math.max(0, messages.size() - recent.size()));
        StringBuilder summary = new StringBuilder("Compressed context summary:\n");
        for (PromptMessageView message : older) {
            String normalized = message.content().replaceAll("\\s+", " ").strip();
            if (normalized.isEmpty()) {
                continue;
            }
            int cap = Math.max(48, properties.getContext().getSummaryMaxCharacters() / Math.max(1, older.size()));
            String excerpt = normalized.length() > cap ? normalized.substring(0, cap) + "..." : normalized;
            summary.append("- ").append(message.role()).append(": ").append(excerpt).append('\n');
            if (summary.length() >= properties.getContext().getSummaryMaxCharacters()) {
                break;
            }
        }

        int compactedTokens = retainedTokens + tokenEstimator.estimate(summary.toString());
        return new ContextWindow(true, summary.toString().strip(), recent, totalTokens, compactedTokens);
    }

    public record ContextWindow(
        boolean compressed,
        String summary,
        List<PromptMessageView> recentMessages,
        int originalTokens,
        int compactedTokens
    ) {
        public String renderForModel() {
            StringBuilder builder = new StringBuilder();
            if (compressed && !summary.isBlank()) {
                builder.append(summary).append("\n\n");
            }
            for (PromptMessageView message : recentMessages) {
                builder.append(message.role()).append(": ").append(message.content()).append("\n\n");
            }
            return builder.toString().strip();
        }
    }
}
