package com.fangyu.code.domain.service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

import org.springframework.stereotype.Service;

@Service
public class SkillMatcher {

    public List<String> match(
        String prompt,
        List<SkillRegistry.SkillDefinition> candidates,
        int maxAutoMatches
    ) {
        if (prompt == null || prompt.isBlank() || candidates == null || candidates.isEmpty()) {
            return List.of();
        }

        String normalizedPrompt = prompt.toLowerCase(Locale.ROOT);
        List<ScoredSkill> scored = new ArrayList<>();
        for (SkillRegistry.SkillDefinition skill : candidates) {
            int score = score(normalizedPrompt, skill);
            if (score > 0) {
                scored.add(new ScoredSkill(skill.id(), score));
            }
        }

        return scored.stream()
            .sorted(Comparator.comparingInt(ScoredSkill::score).reversed().thenComparing(ScoredSkill::id))
            .limit(Math.max(1, maxAutoMatches))
            .map(ScoredSkill::id)
            .toList();
    }

    public List<String> mergeAppliedIds(
        List<String> autoMatched,
        List<String> manualSkillIds,
        Set<String> disabledSkillIds,
        Set<String> availableSkillIds,
        int maxInjectedSkills
    ) {
        LinkedHashSet<String> merged = new LinkedHashSet<>();

        if (manualSkillIds != null) {
            for (String skillId : manualSkillIds) {
                if (isAllowed(skillId, disabledSkillIds, availableSkillIds)) {
                    merged.add(skillId);
                }
                if (merged.size() >= maxInjectedSkills) {
                    return List.copyOf(merged);
                }
            }
        }

        if (autoMatched != null) {
            for (String skillId : autoMatched) {
                if (isAllowed(skillId, disabledSkillIds, availableSkillIds)) {
                    merged.add(skillId);
                }
                if (merged.size() >= maxInjectedSkills) {
                    return List.copyOf(merged);
                }
            }
        }

        return List.copyOf(merged);
    }

    private boolean isAllowed(String skillId, Set<String> disabledSkillIds, Set<String> availableSkillIds) {
        if (skillId == null || skillId.isBlank()) {
            return false;
        }
        if (disabledSkillIds != null && disabledSkillIds.contains(skillId)) {
            return false;
        }
        return availableSkillIds == null || availableSkillIds.contains(skillId);
    }

    private int score(String normalizedPrompt, SkillRegistry.SkillDefinition skill) {
        int score = 0;
        String[] tokens = (skill.keywordBase() == null ? "" : skill.keywordBase())
            .split("[^a-z0-9_-]+");
        for (String token : tokens) {
            String normalizedToken = token == null ? "" : token.trim();
            if (normalizedToken.length() < 3) {
                continue;
            }
            if (normalizedPrompt.contains(normalizedToken)) {
                score += normalizedToken.length() >= 8 ? 3 : 2;
            }
        }

        if (skill.name() != null && !skill.name().isBlank()
            && normalizedPrompt.contains(skill.name().toLowerCase(Locale.ROOT))) {
            score += 4;
        }
        return score;
    }

    private record ScoredSkill(String id, int score) {}
}
