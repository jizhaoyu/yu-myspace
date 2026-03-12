package com.fangyu.code.domain.service;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

import org.springframework.stereotype.Service;

import com.fangyu.code.shared.dto.AppSettings;
import com.fangyu.code.shared.dto.SkillDefinitionView;
import com.fangyu.code.shared.dto.SkillMatchSnapshot;
import com.fangyu.code.shared.dto.SkillSettingsUpdateRequest;

@Service
public class SkillService {

    private static final int MAX_INJECTED_SKILLS = 4;
    private static final int MAX_AUTO_MATCHES = 3;

    private final SkillRegistry skillRegistry;
    private final SkillMatcher skillMatcher;
    private final SkillInjector skillInjector;
    private final SettingsService settingsService;

    public SkillService(
        SkillRegistry skillRegistry,
        SkillMatcher skillMatcher,
        SkillInjector skillInjector,
        SettingsService settingsService
    ) {
        this.skillRegistry = skillRegistry;
        this.skillMatcher = skillMatcher;
        this.skillInjector = skillInjector;
        this.settingsService = settingsService;
    }

    public List<SkillDefinitionView> listSkills() {
        AppSettings settings = settingsService.load();
        Set<String> disabled = Set.copyOf(normalizeIds(settings.disabledSkillIds()));
        return skillRegistry.listAll().stream()
            .map(skill -> new SkillDefinitionView(
                skill.id(),
                skill.name(),
                skill.description(),
                skill.path(),
                !disabled.contains(skill.id())
            ))
            .toList();
    }

    public List<SkillDefinitionView> refreshSkills() {
        skillRegistry.refresh();
        return listSkills();
    }

    public AppSettings updateSkillSettings(SkillSettingsUpdateRequest request) {
        AppSettings current = settingsService.load();

        List<String> disabled = request == null || request.disabledSkillIds() == null
            ? current.disabledSkillIds()
            : normalizeIds(request.disabledSkillIds());

        List<String> manual = request == null || request.manualSkillIds() == null
            ? current.manualSkillIds()
            : normalizeIds(request.manualSkillIds());

        AppSettings next = new AppSettings(
            current.theme(),
            current.defaultEngine(),
            current.autostartEnabled(),
            current.sessionBudgetUsd(),
            current.weeklyBudgetUsd(),
            current.codexEndpoint(),
            current.codexModel(),
            current.codexApiKey(),
            request == null || request.skillsEnabled() == null ? current.skillsEnabled() : request.skillsEnabled(),
            disabled,
            manual
        );
        return settingsService.update(next);
    }

    public SkillMatchSnapshot matchSnapshot(String prompt) {
        AppSettings settings = settingsService.load();
        return buildMatchSnapshot(prompt, settings);
    }

    public PromptInjectionPlan injectPrompt(String basePrompt) {
        AppSettings settings = settingsService.load();
        SkillMatchSnapshot snapshot = buildMatchSnapshot(basePrompt, settings);
        if (!snapshot.injected()) {
            return new PromptInjectionPlan(basePrompt, snapshot);
        }

        List<SkillRegistry.SkillDefinition> appliedDefinitions = snapshot.appliedSkillIds().stream()
            .map(skillRegistry::findById)
            .filter(skill -> skill != null)
            .toList();
        String injectedPrompt = skillInjector.inject(basePrompt, appliedDefinitions);
        return new PromptInjectionPlan(injectedPrompt, snapshot);
    }

    private SkillMatchSnapshot buildMatchSnapshot(String prompt, AppSettings settings) {
        if (settings == null || !settings.skillsEnabled()) {
            return new SkillMatchSnapshot(List.of(), List.of(), List.of(), false);
        }

        List<SkillRegistry.SkillDefinition> allSkills = skillRegistry.listAll();
        Set<String> availableIds = allSkills.stream().map(SkillRegistry.SkillDefinition::id).collect(java.util.stream.Collectors.toSet());
        Set<String> disabledIds = Set.copyOf(normalizeIds(settings.disabledSkillIds()));
        List<String> manualIds = normalizeIds(settings.manualSkillIds());

        List<SkillRegistry.SkillDefinition> enabledSkills = allSkills.stream()
            .filter(skill -> !disabledIds.contains(skill.id()))
            .toList();

        List<String> autoMatched = skillMatcher.match(prompt, enabledSkills, MAX_AUTO_MATCHES);
        List<String> applied = skillMatcher.mergeAppliedIds(
            autoMatched,
            manualIds,
            disabledIds,
            availableIds,
            MAX_INJECTED_SKILLS
        );

        return new SkillMatchSnapshot(autoMatched, manualIds, applied, !applied.isEmpty());
    }

    private List<String> normalizeIds(List<String> ids) {
        if (ids == null || ids.isEmpty()) {
            return List.of();
        }
        LinkedHashSet<String> normalized = new LinkedHashSet<>();
        for (String id : ids) {
            if (id == null || id.isBlank()) {
                continue;
            }
            normalized.add(id.strip().toLowerCase(Locale.ROOT));
        }
        return List.copyOf(normalized);
    }

    public record PromptInjectionPlan(String prompt, SkillMatchSnapshot snapshot) {}
}
