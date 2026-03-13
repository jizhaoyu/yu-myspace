package com.fangyu.code.domain.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fangyu.code.config.FangyuProperties;
import com.fangyu.code.shared.dto.McpServerSpec;
import com.fangyu.code.shared.dto.McpUpsertRequest;

class McpRegistryServiceTest {

    @Test
    void upsertAndSyncShouldWriteRegistryAndOpencodeConfig() throws Exception {
        Path tmp = Files.createTempDirectory("fangyu-mcp-test-");
        Path registry = tmp.resolve("mcp-registry.json");
        Path opencode = tmp.resolve("opencode-mcp.json");

        FangyuProperties properties = new FangyuProperties();
        properties.getMcp().setRegistryPath(registry.toString());
        properties.getMcp().setOpencodeConfigPath(opencode.toString());

        McpRegistryService service = new McpRegistryService(
            new ObjectMapper(),
            properties,
            Clock.fixed(Instant.parse("2026-03-12T10:15:30Z"), ZoneOffset.UTC)
        );

        service.upsert(new McpUpsertRequest(
            "filesystem",
            "filesystem",
            new McpServerSpec("stdio", "npx", List.of("-y", "@modelcontextprotocol/server-filesystem"), "", Map.of(), 12_000),
            true,
            List.of("opencode"),
            "File system server",
            List.of("fs")
        ));

        assertThat(service.snapshot().servers()).hasSize(1);
        assertThat(Files.exists(registry)).isTrue();

        service.syncToOpenCode();
        assertThat(Files.exists(opencode)).isTrue();
        String opencodeJson = Files.readString(opencode);
        assertThat(opencodeJson).contains("filesystem");
        assertThat(opencodeJson).contains("mcpServers");
    }

    @Test
    void importFromOpenCodeShouldKeepDisabledAndMetadataButUpdateSpec() throws Exception {
        Path tmp = Files.createTempDirectory("fangyu-mcp-import-test-");
        Path registry = tmp.resolve("mcp-registry.json");
        Path opencode = tmp.resolve("opencode-mcp.json");

        FangyuProperties properties = new FangyuProperties();
        properties.getMcp().setRegistryPath(registry.toString());
        properties.getMcp().setOpencodeConfigPath(opencode.toString());

        McpRegistryService service = new McpRegistryService(
            new ObjectMapper(),
            properties,
            Clock.fixed(Instant.parse("2026-03-12T10:15:30Z"), ZoneOffset.UTC)
        );

        service.upsert(new McpUpsertRequest(
            "server-one",
            "Server One",
            new McpServerSpec("stdio", "oldcmd", List.of("--old"), "", Map.of(), null),
            false,
            List.of("opencode"),
            "keep-description",
            List.of("keep-tag")
        ));

        Files.writeString(
            opencode,
            """
            {
              \"mcpServers\": {
                \"server-one\": {
                  \"transport\": \"stdio\",
                  \"command\": \"newcmd\",
                  \"args\": [\"--new\"]
                }
              }
            }
            """
        );

        service.importFromOpenCode();

        var snapshot = service.snapshot();
        assertThat(snapshot.servers()).hasSize(1);
        var entry = snapshot.servers().getFirst();
        assertThat(entry.id()).isEqualTo("server-one");
        assertThat(entry.enabled()).isFalse();
        assertThat(entry.name()).isEqualTo("Server One");
        assertThat(entry.description()).isEqualTo("keep-description");
        assertThat(entry.tags()).containsExactly("keep-tag");
        assertThat(entry.targetApps()).contains("opencode");
        assertThat(entry.spec().command()).isEqualTo("newcmd");
        assertThat(entry.spec().args()).containsExactly("--new");
    }
}
