package com.fangyu.code.domain.engine;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Clock;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fangyu.code.config.FangyuProperties;
import com.fangyu.code.domain.model.AiEngineKind;
import com.fangyu.code.domain.service.CostTrackerService;
import com.fangyu.code.domain.service.TokenEstimator;

@Component
public class CodexEngine implements AiEngine {

    private final FangyuProperties properties;
    private final CostTrackerService costTrackerService;
    private final TokenEstimator tokenEstimator;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;
    private final Clock clock;

    public CodexEngine(
        FangyuProperties properties,
        CostTrackerService costTrackerService,
        TokenEstimator tokenEstimator,
        ObjectMapper objectMapper,
        Clock clock
    ) {
        this.properties = properties;
        this.costTrackerService = costTrackerService;
        this.tokenEstimator = tokenEstimator;
        this.objectMapper = objectMapper;
        this.clock = clock;
        this.httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(20))
            .build();
    }

    @Override
    public AiEngineKind kind() {
        return AiEngineKind.OPENAI_CODEX;
    }

    @Override
    public boolean isAvailable() {
        FangyuProperties.CodexEngine settings = properties.getEngines().getCodex();
        return settings.isEnabled()
            && settings.getEndpoint() != null
            && !settings.getEndpoint().isBlank()
            && settings.getApiKey() != null
            && !settings.getApiKey().isBlank();
    }

    @Override
    public EngineExecutionResult execute(EngineExecutionRequest request, EngineExecutionObserver observer) throws Exception {
        if (!isAvailable()) {
            throw new IllegalStateException("OpenAI Codex API key or endpoint is missing");
        }

        long startedAt = clock.millis();
        observer.onStage("building-request", 0.15d, "Preparing Codex API call");

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", properties.getEngines().getCodex().getModel());
        body.put("input", request.asModelInput());
        body.put("stream", false);

        HttpRequest httpRequest = HttpRequest.newBuilder()
            .uri(URI.create(properties.getEngines().getCodex().getEndpoint()))
            .header("Authorization", "Bearer " + properties.getEngines().getCodex().getApiKey())
            .header("Content-Type", "application/json")
            .timeout(request.timeout())
            .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body)))
            .build();

        HttpResponse<String> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() >= 400) {
            throw new IllegalStateException("Codex API returned " + response.statusCode() + ": " + response.body());
        }

        observer.onStage("parsing-response", 0.68d, "Processing Codex response");
        JsonNode root = objectMapper.readTree(response.body());
        String content = extractResponseText(root);
        int inputTokens = extractUsage(root, "input_tokens", tokenEstimator.estimate(request.asModelInput()));
        int outputTokens = extractUsage(root, "output_tokens", tokenEstimator.estimate(content));
        emitChunks(content, observer, request);
        observer.onUsage(inputTokens, outputTokens);
        return new EngineExecutionResult(
            content,
            inputTokens,
            outputTokens,
            costTrackerService.calculate(kind(), inputTokens, outputTokens),
            clock.millis() - startedAt
        );
    }

    private void emitChunks(String content, EngineExecutionObserver observer, EngineExecutionRequest request) throws Exception {
        observer.onStage("streaming-back", 0.82d, "Streaming synthesized response");
        int chunkSize = 180;
        for (int index = 0; index < content.length(); index += chunkSize) {
            if (observer.isCancelled() || request.cancelled().getAsBoolean()) {
                throw new InterruptedException("Task cancelled");
            }
            int end = Math.min(content.length(), index + chunkSize);
            observer.onChunk(content.substring(index, end));
        }
    }

    private int extractUsage(JsonNode root, String field, int fallback) {
        JsonNode usage = root.path("usage").path(field);
        return usage.isNumber() ? usage.asInt() : fallback;
    }

    private String extractResponseText(JsonNode root) {
        JsonNode outputText = root.path("output_text");
        if (outputText.isTextual() && !outputText.asText().isBlank()) {
            return outputText.asText();
        }

        StringBuilder builder = new StringBuilder();
        JsonNode output = root.path("output");
        if (output.isArray()) {
            for (JsonNode item : output) {
                JsonNode contentNodes = item.path("content");
                if (!contentNodes.isArray()) {
                    continue;
                }
                for (JsonNode content : contentNodes) {
                    if (content.hasNonNull("text")) {
                        builder.append(content.get("text").asText());
                    }
                }
            }
        }
        return builder.length() > 0 ? builder.toString() : root.toPrettyString();
    }
}
