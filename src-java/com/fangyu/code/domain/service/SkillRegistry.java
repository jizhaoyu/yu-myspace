package com.fangyu.code.domain.service;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
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
    private final AtomicReference<List<SkillDefinition>> cache = new AtomicReference<>(List.of());

    public SkillRegistry(SkillParser skillParser) {
        this.skillParser = skillParser;
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
        Path root = Paths.get("skills");
        List<SkillDefinition> loaded = new ArrayList<>();
        try (var stream = java.nio.file.Files.walk(root)) {
            stream
                .filter(path -> java.nio.file.Files.isRegularFile(path))
                .filter(path -> "SKILL.md".equalsIgnoreCase(path.getFileName().toString()))
                .sorted(Comparator.comparing(path -> path.toString().toLowerCase(Locale.ROOT)))
                .forEach(path -> {
                    try {
                        loaded.add(skillParser.parse(path));
                    } catch (Exception ignored) {
                    }
                });
        } catch (Exception ignored) {
        }

        List<SkillDefinition> immutable = Collections.unmodifiableList(loaded);
        cache.set(immutable);
        logger.info("skills refreshed count={} root={}", immutable.size(), root.toAbsolutePath().normalize());
        return immutable;
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
