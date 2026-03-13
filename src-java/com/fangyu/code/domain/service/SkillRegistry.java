package com.fangyu.code.domain.service;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.atomic.AtomicReference;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class SkillRegistry {

    private static final Logger logger = LoggerFactory.getLogger(SkillRegistry.class);

    private final SkillParser skillParser;
    private final CodexExternalConfigService codexExternalConfigService;
    private final AtomicReference<List<SkillDefinition>> cache = new AtomicReference<>(List.of());

    public SkillRegistry(SkillParser skillParser, CodexExternalConfigService codexExternalConfigService) {
        this.skillParser = skillParser;
        this.codexExternalConfigService = codexExternalConfigService;
        refresh();
    }

    public List<SkillDefinition> listAll() {
        return cache.get();
    }

    public List<SkillDefinition> listEnabled(Set<String> disabledSkillIds) {
        Set<String> disabled = disabledSkillIds == null ? Set.of() : disabledSkillIds;
        return cache.get().stream()
            .filter(skill -> !disabled.contains(skill.id().toLowerCase(Locale.ROOT)))
            .toList();
    }

    public List<SkillDefinition> refresh() {
        Path projectRoot = Paths.get("skills");
        Path globalRoot = codexExternalConfigService.globalSkillsRoot();
        LinkedHashMap<String, SkillDefinition> byId = new LinkedHashMap<>();

        loadSkillRoot(globalRoot, byId);
        loadSkillRoot(projectRoot, byId);

        List<SkillDefinition> loaded = new ArrayList<>(byId.values());
        List<SkillDefinition> immutable = Collections.unmodifiableList(loaded);
        cache.set(immutable);
        logger.info(
            "skills refreshed count={} projectRoot={} globalRoot={}",
            immutable.size(),
            projectRoot.toAbsolutePath().normalize(),
            globalRoot
        );
        return immutable;
    }

    private void loadSkillRoot(Path root, LinkedHashMap<String, SkillDefinition> byId) {
        try (var stream = java.nio.file.Files.walk(root)) {
            stream
                .filter(path -> java.nio.file.Files.isRegularFile(path))
                .filter(path -> "SKILL.md".equalsIgnoreCase(path.getFileName().toString()))
                .sorted(Comparator.comparing(path -> path.toString().toLowerCase(Locale.ROOT)))
                .forEach(path -> {
                    try {
                        SkillDefinition definition = skillParser.parse(path);
                        byId.put(definition.id().toLowerCase(Locale.ROOT), definition);
                    } catch (Exception ignored) {
                    }
                });
        } catch (Exception ignored) {
        }
    }

    public SkillDefinition findById(String skillId) {
        if (skillId == null || skillId.isBlank()) {
            return null;
        }
        return cache.get().stream()
            .filter(skill -> skill.id().equalsIgnoreCase(skillId))
            .findFirst()
            .orElse(null);
    }

    public record SkillDefinition(
        String id,
        String name,
        String description,
        String path,
        String content,
        String keywordBase
    ) {}
}
