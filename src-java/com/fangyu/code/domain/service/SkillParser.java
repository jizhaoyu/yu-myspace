package com.fangyu.code.domain.service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.stereotype.Service;

@Service
public class SkillParser {

    private static final Pattern FIELD_PATTERN = Pattern.compile("(?m)^([a-zA-Z0-9_-]+):\\s*\"?(.*?)\"?\\s*$");

    public SkillRegistry.SkillDefinition parse(Path skillFile) {
        try {
            String raw = Files.readString(skillFile, StandardCharsets.UTF_8);
            Frontmatter frontmatter = readFrontmatter(raw);
            String content = stripFrontmatter(raw).strip();

            Path parent = skillFile.getParent();
            String id = (parent == null ? skillFile.getFileName() : parent.getFileName()).toString().trim();
            String name = frontmatter.name() == null || frontmatter.name().isBlank() ? id : frontmatter.name().trim();
            String description = frontmatter.description() == null ? "" : frontmatter.description().trim();
            String keywordBase = (name + " " + description + " " + id).toLowerCase(Locale.ROOT);

            return new SkillRegistry.SkillDefinition(
                id,
                name,
                description,
                skillFile.toString(),
                content,
                keywordBase
            );
        } catch (IOException exception) {
            throw new IllegalStateException("Failed to parse skill file: " + skillFile, exception);
        }
    }

    private Frontmatter readFrontmatter(String raw) {
        String trimmed = raw == null ? "" : raw.stripLeading();
        if (!trimmed.startsWith("---")) {
            return new Frontmatter(null, null);
        }
        int secondFence = trimmed.indexOf("\n---", 3);
        if (secondFence < 0) {
            return new Frontmatter(null, null);
        }
        String block = trimmed.substring(3, secondFence + 1);
        Matcher matcher = FIELD_PATTERN.matcher(block);
        String name = null;
        String description = null;
        while (matcher.find()) {
            String key = matcher.group(1).trim().toLowerCase(Locale.ROOT);
            String value = matcher.group(2).trim();
            if ("name".equals(key)) {
                name = value;
            } else if ("description".equals(key)) {
                description = value;
            }
        }
        return new Frontmatter(name, description);
    }

    private String stripFrontmatter(String raw) {
        String trimmed = raw == null ? "" : raw.stripLeading();
        if (!trimmed.startsWith("---")) {
            return raw;
        }
        int secondFence = trimmed.indexOf("\n---", 3);
        if (secondFence < 0) {
            return raw;
        }
        int start = secondFence + 4;
        if (start < trimmed.length() && trimmed.charAt(start) == '\r') {
            start += 1;
        }
        if (start < trimmed.length() && trimmed.charAt(start) == '\n') {
            start += 1;
        }
        return trimmed.substring(Math.min(start, trimmed.length()));
    }

    private record Frontmatter(String name, String description) {}
}
