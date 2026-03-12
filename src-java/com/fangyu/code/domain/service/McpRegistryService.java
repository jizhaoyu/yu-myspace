package com.fangyu.code.domain.service;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Clock;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fangyu.code.config.FangyuProperties;
import com.fangyu.code.shared.dto.McpRegistrySnapshot;
import com.fangyu.code.shared.dto.McpServerEntry;
import com.fangyu.code.shared.dto.McpServerSpec;
import com.fangyu.code.shared.dto.McpUpsertRequest;

@Service
public class McpRegistryService {

    private static final Logger logger = LoggerFactory.getLogger(McpRegistryService.class);

    private static final TypeReference<RegistryDocument> REGISTRY_DOC_TYPE = new TypeReference<>() {};
    private static final String TARGET_OPENCODE = "opencode";

    private final ObjectMapper objectMapper;
    private final FangyuProperties properties;
    private final Clock clock;

    public McpRegistryService(ObjectMapper objectMapper, FangyuProperties properties, Clock clock) {
        this.objectMapper = objectMapper;
        this.properties = properties;
        this.clock = clock;
    }

    public McpRegistrySnapshot snapshot() {
        RegistryDocument document = readRegistry();
        List<McpServerEntry> servers = document.servers().stream()
            .sorted(Comparator.comparing(McpServerEntry::updatedAt).reversed().thenComparing(McpServerEntry::id))
            .toList();
        return new McpRegistrySnapshot(
            servers,
            document.updatedAt(),
            registryPath().toString(),
            opencodeConfigPath().toString()
        );
    }

    public McpRegistrySnapshot upsert(McpUpsertRequest request) {
        Objects.requireNonNull(request, "request");
        RegistryDocument document = readRegistry();
        List<McpServerEntry> next = new ArrayList<>(document.servers());

        String id = normalizeId(request.id() == null || request.id().isBlank() ? request.name() : request.id());
        if (id.isBlank()) {
            throw new IllegalArgumentException("MCP server id is required");
        }

        McpServerSpec spec = sanitizeSpec(request.spec());
        List<String> targetApps = sanitizeTargetApps(request.targetApps());
        long now = clock.millis();

        McpServerEntry entry = new McpServerEntry(
            id,
            request.name() == null || request.name().isBlank() ? id : request.name().strip(),
            spec,
            request.enabled() == null ? true : request.enabled(),
            targetApps,
            request.description() == null ? "" : request.description().strip(),
            sanitizeTags(request.tags()),
            now
        );

        next.removeIf(item -> item.id().equalsIgnoreCase(id));
        next.add(entry);
        writeRegistry(new RegistryDocument(next, now));
        return snapshot();
    }

    public McpRegistrySnapshot delete(String id) {
        String normalizedId = normalizeId(id);
        RegistryDocument document = readRegistry();
        List<McpServerEntry> next = new ArrayList<>(document.servers());
        boolean removed = next.removeIf(item -> item.id().equalsIgnoreCase(normalizedId));
        if (removed) {
            writeRegistry(new RegistryDocument(next, clock.millis()));
        }
        return snapshot();
    }

    public McpRegistrySnapshot setEnabled(String id, boolean enabled) {
        String normalizedId = normalizeId(id);
        RegistryDocument document = readRegistry();
        List<McpServerEntry> next = new ArrayList<>();
        long now = clock.millis();
        for (McpServerEntry item : document.servers()) {
            if (item.id().equalsIgnoreCase(normalizedId)) {
                next.add(new McpServerEntry(
                    item.id(),
                    item.name(),
                    item.spec(),
                    enabled,
                    item.targetApps(),
                    item.description(),
                    item.tags(),
                    now
                ));
            } else {
                next.add(item);
            }
        }
        writeRegistry(new RegistryDocument(next, now));
        return snapshot();
    }

    public McpRegistrySnapshot syncToOpenCode() {
        RegistryDocument document = readRegistry();
        Map<String, Object> mcpServers = new LinkedHashMap<>();

        for (McpServerEntry entry : document.servers()) {
            if (!entry.enabled()) {
                continue;
            }
            if (entry.targetApps() != null && !entry.targetApps().isEmpty()
                && entry.targetApps().stream().noneMatch(app -> TARGET_OPENCODE.equalsIgnoreCase(app))) {
                continue;
            }

            Map<String, Object> spec = new LinkedHashMap<>();
            spec.put("transport", entry.spec().transport());
            if (entry.spec().command() != null && !entry.spec().command().isBlank()) {
                spec.put("command", entry.spec().command());
            }
            if (entry.spec().args() != null && !entry.spec().args().isEmpty()) {
                spec.put("args", entry.spec().args());
            }
            if (entry.spec().url() != null && !entry.spec().url().isBlank()) {
                spec.put("url", entry.spec().url());
            }
            if (entry.spec().env() != null && !entry.spec().env().isEmpty()) {
                spec.put("env", entry.spec().env());
            }
            if (entry.spec().timeoutMs() != null && entry.spec().timeoutMs() > 0) {
                spec.put("timeoutMs", entry.spec().timeoutMs());
            }
            mcpServers.put(entry.id(), spec);
        }

        Map<String, Object> doc = new LinkedHashMap<>();
        doc.put("mcpServers", mcpServers);
        writeJson(opencodeConfigPath(), doc);
        logger.info("mcp sync to opencode completed exportedServers={}", mcpServers.size());
        return snapshot();
    }

    public McpRegistrySnapshot importFromOpenCode() {
        Path opencodePath = opencodeConfigPath();
        if (!Files.exists(opencodePath)) {
            return snapshot();
        }

        try {
            Map<String, Object> raw = objectMapper.readValue(Files.readString(opencodePath, StandardCharsets.UTF_8), new TypeReference<>() {});
            Object mcpServersRaw = raw.get("mcpServers");
            if (!(mcpServersRaw instanceof Map<?, ?> serversMap)) {
                return snapshot();
            }

            RegistryDocument current = readRegistry();
            Map<String, McpServerEntry> byId = new LinkedHashMap<>();
            for (McpServerEntry entry : current.servers()) {
                byId.put(entry.id().toLowerCase(Locale.ROOT), entry);
            }

            long now = clock.millis();
            for (Map.Entry<?, ?> serverEntry : serversMap.entrySet()) {
                String id = normalizeId(String.valueOf(serverEntry.getKey()));
                if (id.isBlank() || !(serverEntry.getValue() instanceof Map<?, ?> specMap)) {
                    continue;
                }

                McpServerSpec spec = mapToSpec(specMap);
                List<String> targetApps = List.of(TARGET_OPENCODE);
                McpServerEntry existing = byId.get(id.toLowerCase(Locale.ROOT));
                McpServerEntry merged = new McpServerEntry(
                    id,
                    existing == null ? id : existing.name(),
                    sanitizeSpec(spec),
                    true,
                    mergeTargetApps(existing == null ? List.of() : existing.targetApps(), targetApps),
                    existing == null ? "" : existing.description(),
                    existing == null ? List.of() : existing.tags(),
                    now
                );
                byId.put(id.toLowerCase(Locale.ROOT), merged);
            }

            writeRegistry(new RegistryDocument(new ArrayList<>(byId.values()), now));
            logger.info("mcp import from opencode completed totalServers={}", byId.size());
            return snapshot();
        } catch (Exception exception) {
            logger.error("mcp import from opencode failed reason={}", exception.getMessage());
            throw new IllegalStateException("Failed to import OpenCode MCP config", exception);
        }
    }

    private McpServerSpec mapToSpec(Map<?, ?> raw) {
        String transport = rawValue(raw.get("transport"));
        String command = rawValue(raw.get("command"));
        String url = rawValue(raw.get("url"));
        Integer timeoutMs = parseInteger(raw.get("timeoutMs"));

        List<String> args = List.of();
        if (raw.get("args") instanceof List<?> list) {
            args = list.stream().map(String::valueOf).toList();
        }

        Map<String, String> env = Map.of();
        if (raw.get("env") instanceof Map<?, ?> map) {
            Map<String, String> next = new LinkedHashMap<>();
            map.forEach((key, value) -> next.put(String.valueOf(key), String.valueOf(value)));
            env = next;
        }

        return new McpServerSpec(transport, command, args, url, env, timeoutMs);
    }

    private Integer parseInteger(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number number) {
            return number.intValue();
        }
        try {
            return Integer.parseInt(String.valueOf(value).trim());
        } catch (Exception ignored) {
            return null;
        }
    }

    private String rawValue(Object value) {
        return value == null ? "" : String.valueOf(value).trim();
    }

    private McpServerSpec sanitizeSpec(McpServerSpec spec) {
        if (spec == null) {
            throw new IllegalArgumentException("MCP server spec is required");
        }
        String transport = normalizeTransport(spec.transport());
        String command = spec.command() == null ? "" : spec.command().strip();
        String url = spec.url() == null ? "" : spec.url().strip();

        if ("stdio".equals(transport) && command.isBlank()) {
            throw new IllegalArgumentException("stdio transport requires command");
        }
        if (("http".equals(transport) || "sse".equals(transport)) && url.isBlank()) {
            throw new IllegalArgumentException(transport + " transport requires url");
        }

        List<String> args = spec.args() == null ? List.of() : spec.args().stream()
            .filter(item -> item != null && !item.isBlank())
            .map(String::strip)
            .toList();
        Map<String, String> env = spec.env() == null ? Map.of() : new LinkedHashMap<>(spec.env());
        Integer timeoutMs = spec.timeoutMs() == null || spec.timeoutMs() <= 0 ? null : spec.timeoutMs();

        return new McpServerSpec(transport, command, args, url, env, timeoutMs);
    }

    private String normalizeTransport(String transport) {
        String normalized = transport == null ? "" : transport.strip().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "stdio", "http", "sse" -> normalized;
            default -> throw new IllegalArgumentException("Unsupported MCP transport: " + transport);
        };
    }

    private List<String> sanitizeTargetApps(List<String> targetApps) {
        if (targetApps == null || targetApps.isEmpty()) {
            return List.of(TARGET_OPENCODE);
        }
        LinkedHashSet<String> normalized = new LinkedHashSet<>();
        for (String app : targetApps) {
            if (app == null || app.isBlank()) {
                continue;
            }
            normalized.add(app.strip().toLowerCase(Locale.ROOT));
        }
        if (normalized.isEmpty()) {
            normalized.add(TARGET_OPENCODE);
        }
        return List.copyOf(normalized);
    }

    private List<String> sanitizeTags(List<String> tags) {
        if (tags == null || tags.isEmpty()) {
            return List.of();
        }
        LinkedHashSet<String> normalized = new LinkedHashSet<>();
        for (String tag : tags) {
            if (tag == null || tag.isBlank()) {
                continue;
            }
            normalized.add(tag.strip());
        }
        return List.copyOf(normalized);
    }

    private List<String> mergeTargetApps(List<String> current, List<String> incoming) {
        Set<String> merged = new LinkedHashSet<>();
        if (current != null) {
            merged.addAll(current);
        }
        if (incoming != null) {
            merged.addAll(incoming);
        }
        return List.copyOf(merged);
    }

    private String normalizeId(String id) {
        if (id == null) {
            return "";
        }
        return id.strip().toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9._-]+", "-");
    }

    private RegistryDocument readRegistry() {
        Path path = registryPath();
        if (!Files.exists(path)) {
            return new RegistryDocument(List.of(), 0L);
        }
        try {
            RegistryDocument document = objectMapper.readValue(Files.readString(path, StandardCharsets.UTF_8), REGISTRY_DOC_TYPE);
            if (document == null || document.servers() == null) {
                return new RegistryDocument(List.of(), 0L);
            }
            return document;
        } catch (Exception exception) {
            throw new IllegalStateException("Failed to read MCP registry", exception);
        }
    }

    private void writeRegistry(RegistryDocument document) {
        writeJson(registryPath(), document);
    }

    private void writeJson(Path file, Object content) {
        try {
            if (file.getParent() != null) {
                Files.createDirectories(file.getParent());
            }
            Files.writeString(file, objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(content), StandardCharsets.UTF_8);
        } catch (Exception exception) {
            throw new IllegalStateException("Failed to write MCP file: " + file, exception);
        }
    }

    private Path registryPath() {
        String configured = properties.getMcp().getRegistryPath();
        if (configured != null && !configured.isBlank()) {
            return Paths.get(configured.strip()).toAbsolutePath().normalize();
        }
        return Paths.get(System.getProperty("user.home"), ".fangyu-code", "mcp-registry.json").toAbsolutePath().normalize();
    }

    private Path opencodeConfigPath() {
        String configured = properties.getMcp().getOpencodeConfigPath();
        if (configured != null && !configured.isBlank()) {
            return Paths.get(configured.strip()).toAbsolutePath().normalize();
        }
        return Paths.get(System.getProperty("user.home"), ".opencode", "mcp.json").toAbsolutePath().normalize();
    }

    private record RegistryDocument(List<McpServerEntry> servers, long updatedAt) {}
}
