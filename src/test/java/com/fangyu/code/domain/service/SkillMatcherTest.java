package com.fangyu.code.domain.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Set;

import org.junit.jupiter.api.Test;

class SkillMatcherTest {

    private final SkillMatcher matcher = new SkillMatcher();

    @Test
    void mergeAppliedIdsShouldPrioritizeManualSelections() {
        List<String> merged = matcher.mergeAppliedIds(
            List.of("skill-c", "skill-b", "skill-a"),
            List.of("skill-a", "skill-d"),
            Set.of("skill-b"),
            Set.of("skill-a", "skill-b", "skill-c", "skill-d"),
            4
        );

        assertThat(merged).containsExactly("skill-a", "skill-d", "skill-c");
    }

    @Test
    void matchShouldReturnStableTopResults() {
        List<SkillRegistry.SkillDefinition> skills = List.of(
            new SkillRegistry.SkillDefinition("a", "krema", "desktop bridge and krema command", "", "", "krema desktop bridge command"),
            new SkillRegistry.SkillDefinition("b", "java-svc", "spring service layer", "", "", "spring service java"),
            new SkillRegistry.SkillDefinition("c", "ui", "react component style", "", "", "react component ui")
        );

        List<String> matched = matcher.match("Need krema desktop command and bridge wiring", skills, 3);

        assertThat(matched).contains("a");
        assertThat(matched.getFirst()).isEqualTo("a");
    }
}
