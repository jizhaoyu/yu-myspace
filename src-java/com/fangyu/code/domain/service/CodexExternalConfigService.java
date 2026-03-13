package com.fangyu.code.domain.service;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class CodexExternalConfigService {

    private static final Logger logger = LoggerFactory.getLogger(CodexExternalConfigService.class);

    private final ObjectMapper objectMapper;

    public CodexExternalConfigService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public Path codexHome() {
        String configured = System.getProperty("codex.home");
        if (configured == null || configured.isBlank()) {
            configured = System.getenv("CODEX_HOME");
        }
        if (configured != null && !configured.isBlank()) {
            return Path.of(configured.strip()).toAbsolutePath().normalize();
        }
        return Path.of(System.getProperty("user.home"), ".codex").toAbsolutePath().normalize();
    }

    public ExternalEngineDefaults loadEngineDefaults() {
        Path home = codexHome();
        Path configPath = home.resolve("config.toml");
        Path authPath = home.resolve("auth.json");

        if (!Files.exists(configPath)) {
            return ExternalEngineDefaults.empty();
        }

        try {
            Map<String, Map<String, String>> toml = parseToml(configPath);
            Map<String, String> root = toml.getOrDefault("", Map.of());

            String modelProvider = root.get("model_provider");
            String model = root.getOrDefault("model", "");
            String providerSection = modelProvider == null || modelProvider.isBlank()
                ? ""
                : "model_providers." + modelProvider.strip();
            Map<String, String> provider = toml.getOrDefault(providerSection, Map.of());

            String endpoint = buildEndpoint(provider.get("base_url"), provider.get("wire_api"));
            String apiKey = readApiKey(authPath);

            return new ExternalEngineDefaults(
                emptyToNull(endpoint),
                emptyToNull(model),
                emptyToNull(apiKey)
            );
        } catch (Exception exception) {
            logger.warn("failed to load codex external config from {}", configPath, exception);
            return ExternalEngineDefaults.empty();
        }
    }

    public Path globalSkillsRoot() {
        return codexHome().resolve("skills").toAbsolutePath().normalize();
    }

    private Map<String, Map<String, String>> parseToml(Path path) throws Exception {
        List<String> lines = Files.readAllLines(path, StandardCharsets.UTF_8);
        Map<String, Map<String, String>> sections = new LinkedHashMap<>();
        String currentSection = "";
        sections.put(currentSection, new LinkedHashMap<>());

        for (String rawLine : lines) {
            String line = stripInlineComment(rawLine).trim();
            if (line.isEmpty()) {
                continue;
            }
            if (line.startsWith("[") && line.endsWith("]")) {
                currentSection = normalizeSectionName(line.substring(1, line.length() - 1).trim());
                sections.computeIfAbsent(currentSection, ignored -> new LinkedHashMap<>());
                continue;
            }

            int separator = line.indexOf('=');
            if (separator <= 0) {
                continue;
            }

            String key = line.substring(0, separator).trim();
            String value = unquote(line.substring(separator + 1).trim());
            sections.computeIfAbsent(currentSection, ignored -> new LinkedHashMap<>()).put(key, value);
        }

        return sections;
    }

    private String readApiKey(Path authPath) {
        if (!Files.exists(authPath)) {
            return null;
        }
        try {
            JsonNode root = objectMapper.readTree(Files.readString(authPath, StandardCharsets.UTF_8));
            JsonNode apiKey = root.get("OPENAI_API_KEY");
            return apiKey == null || apiKey.isNull() ? null : apiKey.asText(null);
        } catch (Exception exception) {
            logger.warn("failed to load codex auth from {}", authPath, exception);
            return null;
        }
    }

    private String buildEndpoint(String baseUrl, String wireApi) {
        if (baseUrl == null || baseUrl.isBlank()) {
            return null;
        }

        String normalizedBase = stripTrailingSlash(baseUrl.strip());
        String normalizedWireApi = wireApi == null ? "" : wireApi.strip().toLowerCase(Locale.ROOT);

        if (normalizedWireApi.isBlank()) {
            return normalizedBase;
        }
        if (normalizedBase.endsWith("/responses") || normalizedBase.endsWith("/chat/completions")) {
            return normalizedBase;
        }
        if ("responses".equals(normalizedWireApi)) {
            if (normalizedBase.matches(".*/v\\d+$")) {
                return normalizedBase + "/responses";
            }
            return normalizedBase + "/v1/responses";
        }
        if ("chat_completions".equals(normalizedWireApi) || "chat-completions".equals(normalizedWireApi)) {
            if (normalizedBase.matches(".*/v\\d+$")) {
                return normalizedBase + "/chat/completions";
            }
            return normalizedBase + "/v1/chat/completions";
        }
        return normalizedBase;
    }

    private String normalizeSectionName(String value) {
        return value.replace("'", "").replace("\"", "");
    }

    private String stripInlineComment(String value) {
        boolean inSingleQuotes = false;
        boolean inDoubleQuotes = false;
        StringBuilder builder = new StringBuilder(value.length());

        for (int index = 0; index < value.length(); index++) {
            char current = value.charAt(index);
            if (current == '"' && !inSingleQuotes) {
                inDoubleQuotes = !inDoubleQuotes;
            } else if (current == '\'' && !inDoubleQuotes) {
                inSingleQuotes = !inSingleQuotes;
            } else if (current == '#' && !inSingleQuotes && !inDoubleQuotes) {
                break;
            }
            builder.append(current);
        }

        return builder.toString();
    }

    private String unquote(String value) {
        if (value.length() >= 2) {
            if ((value.startsWith("\"") && value.endsWith("\""))
                || (value.startsWith("'") && value.endsWith("'"))) {
                return value.substring(1, value.length() - 1);
            }
        }
        return value;
    }

    private String stripTrailingSlash(String value) {
        String normalized = value;
        while (normalized.endsWith("/")) {
            normalized = normalized.substring(0, normalized.length() - 1);
        }
        return normalized;
    }

    private String emptyToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }

    public record ExternalEngineDefaults(
        String endpoint,
        String model,
        String apiKey
    ) {
        public static ExternalEngineDefaults empty() {
            return new ExternalEngineDefaults(null, null, null);
        }
    }
}
