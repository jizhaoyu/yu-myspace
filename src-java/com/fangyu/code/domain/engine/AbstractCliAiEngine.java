package com.fangyu.code.domain.engine;

import java.io.BufferedReader;
import java.io.OutputStreamWriter;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.time.Clock;
import java.util.concurrent.TimeUnit;

import com.fangyu.code.config.FangyuProperties;
import com.fangyu.code.domain.service.TokenEstimator;

abstract class AbstractCliAiEngine implements AiEngine {

    private final TokenEstimator tokenEstimator;
    private final Clock clock;

    protected AbstractCliAiEngine(TokenEstimator tokenEstimator, Clock clock) {
        this.tokenEstimator = tokenEstimator;
        this.clock = clock;
    }

    protected abstract FangyuProperties.CliEngine settings();

    protected abstract double calculateCost(int inputTokens, int outputTokens);

    @Override
    public boolean isAvailable() {
        FangyuProperties.CliEngine settings = settings();
        return settings.isEnabled() && settings.getExecutable() != null && !settings.getExecutable().isBlank();
    }

    @Override
    public EngineExecutionResult execute(EngineExecutionRequest request, EngineExecutionObserver observer) throws Exception {
        if (!isAvailable()) {
            throw new IllegalStateException("CLI engine is not configured");
        }

        observer.onStage("launching-cli", 0.12d, "Launching local AI CLI");
        long startedAt = clock.millis();
        ProcessBuilder processBuilder = new ProcessBuilder(settings().getExecutable());
        processBuilder.redirectErrorStream(true);
        processBuilder.directory(Path.of(
            request.workingDirectory() == null || request.workingDirectory().isBlank()
                ? settings().getWorkingDirectory()
                : request.workingDirectory()
        ).toFile());

        Process process = processBuilder.start();
        try (OutputStreamWriter writer = new OutputStreamWriter(process.getOutputStream(), StandardCharsets.UTF_8)) {
            writer.write(request.asModelInput());
            writer.flush();
        }

        StringBuilder output = new StringBuilder();
        try (BufferedReader reader = process.inputReader(StandardCharsets.UTF_8)) {
            String line;
            while ((line = reader.readLine()) != null) {
                if (observer.isCancelled() || request.cancelled().getAsBoolean()) {
                    process.destroyForcibly();
                    throw new InterruptedException("Task cancelled");
                }
                output.append(line).append('\n');
                observer.onChunk(line + "\n");
            }
        }

        boolean completed = process.waitFor(request.timeout().toSeconds(), TimeUnit.SECONDS);
        if (!completed) {
            process.destroyForcibly();
            throw new IllegalStateException("CLI engine timed out");
        }
        if (process.exitValue() != 0) {
            throw new IllegalStateException("CLI engine exited with code " + process.exitValue());
        }

        String content = output.toString().strip();
        int inputTokens = tokenEstimator.estimate(request.asModelInput());
        int outputTokens = tokenEstimator.estimate(content);
        observer.onUsage(inputTokens, outputTokens);
        return new EngineExecutionResult(
            content,
            inputTokens,
            outputTokens,
            calculateCost(inputTokens, outputTokens),
            clock.millis() - startedAt
        );
    }
}
