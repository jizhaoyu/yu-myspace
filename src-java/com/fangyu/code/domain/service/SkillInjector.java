package com.fangyu.code.domain.service;

import java.util.List;

import org.springframework.stereotype.Service;

@Service
public class SkillInjector {

    public String inject(String basePrompt, List<SkillRegistry.SkillDefinition> appliedSkills) {
        if (appliedSkills == null || appliedSkills.isEmpty()) {
            return basePrompt;
        }

        StringBuilder builder = new StringBuilder(basePrompt == null ? "" : basePrompt);
        builder.append("\n\n");
        builder.append("Skills context (auto/manual merged):\n");
        for (SkillRegistry.SkillDefinition skill : appliedSkills) {
            builder.append("\n");
            builder.append("[SKILL:").append(skill.id()).append("]\n");
            builder.append("Name: ").append(skill.name()).append("\n");
            if (skill.description() != null && !skill.description().isBlank()) {
                builder.append("Description: ").append(skill.description()).append("\n");
            }
            builder.append("Instructions:\n");
            builder.append(skill.content() == null ? "" : skill.content()).append("\n");
            builder.append("[/SKILL:").append(skill.id()).append("]\n");
        }
        return builder.toString();
    }
}
