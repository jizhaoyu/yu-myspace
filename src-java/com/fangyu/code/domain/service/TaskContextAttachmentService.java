package com.fangyu.code.domain.service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class TaskContextAttachmentService {

    private static final int MAX_FILE_COUNT = 6;
    private static final int MAX_CHARS_PER_FILE = 6_000;
    private static final int MAX_TOTAL_CHARS = 20_000;

    public String renderContextBlock(String workspacePath, List<String> contextFiles) {
        List<String> blocks = new ArrayList<>();

        if (StringUtils.hasText(workspacePath)) {
            blocks.add("Workspace root:\n" + workspacePath.strip());
        }

        if (contextFiles == null || contextFiles.isEmpty()) {
            return String.join("\n\n", blocks);
        }

        int totalChars = blocks.stream().mapToInt(String::length).sum();
        int includedCount = 0;
        for (String rawPath : contextFiles) {
            if (!StringUtils.hasText(rawPath) || includedCount >= MAX_FILE_COUNT || totalChars >= MAX_TOTAL_CHARS) {
                break;
            }

            Path path = Path.of(rawPath.strip()).toAbsolutePath().normalize();
            if (!Files.exists(path) || Files.isDirectory(path)) {
                continue;
            }

            try {
                byte[] bytes = Files.readAllBytes(path);
                String content = new String(bytes, StandardCharsets.UTF_8);
                String excerpt = content.length() > MAX_CHARS_PER_FILE
                    ? content.substring(0, MAX_CHARS_PER_FILE) + "\n... [truncated]"
                    : content;
                String block = "Attached file: " + path + "\n```\n" + excerpt + "\n```";
                if (totalChars + block.length() > MAX_TOTAL_CHARS && includedCount > 0) {
                    break;
                }
                blocks.add(block);
                totalChars += block.length();
                includedCount++;
            } catch (IOException ignored) {
                blocks.add("Attached file: " + path + "\n[unreadable]");
                includedCount++;
            }
        }

        return String.join("\n\n", blocks);
    }
}
