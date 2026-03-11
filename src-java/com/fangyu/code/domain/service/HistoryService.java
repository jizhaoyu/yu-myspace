package com.fangyu.code.domain.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Clock;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import com.fangyu.code.config.FangyuProperties;
import com.fangyu.code.desktop.DesktopEventPublisher;
import com.fangyu.code.domain.model.AiEngineKind;
import com.fangyu.code.persistence.entity.ConversationSessionEntity;
import com.fangyu.code.persistence.entity.PromptMessageEntity;
import com.fangyu.code.persistence.repository.ConversationSessionRepository;
import com.fangyu.code.persistence.repository.PromptMessageRepository;
import com.fangyu.code.persistence.search.HistorySearchRepository;
import com.fangyu.code.shared.dto.ConversationSessionView;
import com.fangyu.code.shared.dto.HistorySearchResult;
import com.fangyu.code.shared.dto.PromptMessageView;

@Service
public class HistoryService {

    private static final DateTimeFormatter EXPORT_TIMESTAMP =
        DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss").withZone(ZoneId.systemDefault());

    private final ConversationSessionRepository sessionRepository;
    private final PromptMessageRepository messageRepository;
    private final HistorySearchRepository historySearchRepository;
    private final FangyuProperties properties;
    private final DesktopEventPublisher eventPublisher;
    private final Clock clock;

    public HistoryService(
        ConversationSessionRepository sessionRepository,
        PromptMessageRepository messageRepository,
        HistorySearchRepository historySearchRepository,
        FangyuProperties properties,
        DesktopEventPublisher eventPublisher,
        Clock clock
    ) {
        this.sessionRepository = sessionRepository;
        this.messageRepository = messageRepository;
        this.historySearchRepository = historySearchRepository;
        this.properties = properties;
        this.eventPublisher = eventPublisher;
        this.clock = clock;
    }

    public ConversationSessionView ensureSession(String sessionId, AiEngineKind engine) {
        if (StringUtils.hasText(sessionId)) {
            return sessionRepository.findById(sessionId)
                .map(this::toView)
                .orElseGet(() -> createSession(sessionId, engine));
        }
        return createSession(UUID.randomUUID().toString(), engine);
    }

    public List<ConversationSessionView> recentSessions() {
        return sessionRepository.findTop20ByOrderByUpdatedAtDesc().stream()
            .map(this::toView)
            .toList();
    }

    public List<PromptMessageView> messages(String sessionId) {
        return messageRepository.findBySessionIdOrderByCreatedAtAsc(sessionId).stream()
            .map(this::toView)
            .toList();
    }

    public PromptMessageView appendUserMessage(String sessionId, String taskId, String prompt) {
        PromptMessageEntity entity = new PromptMessageEntity(
            UUID.randomUUID().toString(),
            sessionId,
            taskId,
            "user",
            prompt,
            0,
            0,
            0d,
            clock.millis()
        );
        messageRepository.save(entity);
        touchSession(sessionId);
        maybePromoteSessionTitle(sessionId, prompt);
        PromptMessageView view = toView(entity);
        eventPublisher.emit(DesktopEventPublisher.HISTORY_UPDATED, view);
        return view;
    }

    public PromptMessageView appendAssistantMessage(
        String sessionId,
        String taskId,
        String content,
        int inputTokens,
        int outputTokens,
        double costUsd
    ) {
        PromptMessageEntity entity = new PromptMessageEntity(
            UUID.randomUUID().toString(),
            sessionId,
            taskId,
            "assistant",
            content,
            inputTokens,
            outputTokens,
            costUsd,
            clock.millis()
        );
        messageRepository.save(entity);
        touchSession(sessionId);
        PromptMessageView view = toView(entity);
        eventPublisher.emit(DesktopEventPublisher.HISTORY_UPDATED, view);
        return view;
    }

    public HistorySearchResult search(String query, int limit) {
        return new HistorySearchResult(query, historySearchRepository.search(query, limit));
    }

    public String exportSession(String sessionId, String outputPath) {
        ConversationSessionView session = sessionRepository.findById(sessionId)
            .map(this::toView)
            .orElseThrow(() -> new IllegalArgumentException("Unknown session: " + sessionId));

        StringBuilder markdown = new StringBuilder();
        markdown.append("# ").append(session.title()).append("\n\n");
        markdown.append("- Session ID: ").append(session.id()).append("\n");
        markdown.append("- Engine: ").append(session.activeEngine()).append("\n");
        markdown.append("- Exported At: ").append(EXPORT_TIMESTAMP.format(clock.instant())).append("\n\n");

        for (PromptMessageView message : messages(sessionId)) {
            markdown.append("## ").append(message.role()).append("\n\n");
            markdown.append(message.content()).append("\n\n");
        }

        Path target = resolveExportPath(session, outputPath);
        try {
            Files.createDirectories(target.getParent());
            Files.writeString(target, markdown.toString());
        } catch (IOException exception) {
            throw new IllegalStateException("Failed to export session", exception);
        }
        return target.toAbsolutePath().toString();
    }

    private ConversationSessionView createSession(String sessionId, AiEngineKind engine) {
        long now = clock.millis();
        ConversationSessionEntity entity = new ConversationSessionEntity(
            sessionId,
            properties.getSessions().getDefaultTitle(),
            engine.name(),
            now,
            now
        );
        sessionRepository.save(entity);
        return toView(entity);
    }

    private void touchSession(String sessionId) {
        sessionRepository.findById(sessionId).ifPresent(existing -> sessionRepository.save(
            new ConversationSessionEntity(
                existing.id(),
                existing.title(),
                existing.activeEngine(),
                existing.createdAt(),
                clock.millis()
            )
        ));
    }

    private void maybePromoteSessionTitle(String sessionId, String prompt) {
        sessionRepository.findById(sessionId).ifPresent(existing -> {
            if (!properties.getSessions().getDefaultTitle().equals(existing.title())) {
                return;
            }
            String normalized = prompt.strip();
            if (!normalized.isBlank()) {
                String nextTitle = normalized.length() > 28 ? normalized.substring(0, 28) + "..." : normalized;
                sessionRepository.save(new ConversationSessionEntity(
                    existing.id(),
                    nextTitle,
                    existing.activeEngine(),
                    existing.createdAt(),
                    clock.millis()
                ));
            }
        });
    }

    private Path resolveExportPath(ConversationSessionView session, String outputPath) {
        if (StringUtils.hasText(outputPath)) {
            return Path.of(outputPath);
        }
        String safeTitle = session.title().replaceAll("[^a-zA-Z0-9\\u4e00-\\u9fa5-_]+", "-");
        return Path.of("exports", safeTitle + "-" + EXPORT_TIMESTAMP.format(clock.instant()) + ".md");
    }

    private ConversationSessionView toView(ConversationSessionEntity entity) {
        return new ConversationSessionView(
            entity.id(),
            entity.title(),
            entity.activeEngine(),
            entity.createdAt(),
            entity.updatedAt()
        );
    }

    private PromptMessageView toView(PromptMessageEntity entity) {
        return new PromptMessageView(
            entity.id(),
            entity.sessionId(),
            entity.taskId(),
            entity.role(),
            entity.content(),
            entity.inputTokens(),
            entity.outputTokens(),
            entity.costUsd(),
            entity.createdAt()
        );
    }
}
