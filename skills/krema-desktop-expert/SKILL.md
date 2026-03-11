---
name: krema-desktop-expert
description: "Expert workflow for planning, scaffolding, implementing, debugging, and reviewing Krema desktop applications with a Java backend and web frontend. Use when the task involves Krema, @KremaCommand, window.krema.invoke, window.krema.on, krema.toml, system tray or autostart integration, native plugin wiring, or packaging a Java desktop app with React, Vue, Angular, Svelte, or plain web UI."
---

# Krema Desktop Expert

## Overview

Build or modify Krema applications as three coordinated layers: Java backend, frontend web app, and desktop runtime/configuration. Inspect the local project's actual Krema version and build files first, then keep the Krema bridge thin so business logic stays in normal services instead of desktop glue code.

## Quick Start

- Inspect `pom.xml`, `build.gradle`, `package.json`, `krema.toml`, and the app entry before proposing code. Do not invent version-sensitive APIs.
- Keep `@KremaCommand` classes thin. Put business rules in services, then expose only the required bridge methods.
- Centralize `window.krema.invoke()` and `window.krema.on()` behind typed frontend helpers instead of scattering calls across components.
- Use commands for request/response work and events for progress, streaming, or background state pushes.
- Read [project-patterns.md](references/project-patterns.md) when you need a fuller scaffold, capability checklist, or troubleshooting matrix.

## Workflow

### 1. Map the runtime boundary

- Identify the Java entrypoint, frontend dev/build commands, and how the app bootstrap registers commands, window options, and development URLs.
- Confirm where `krema.toml` lives and which permissions or plugins are enabled.
- Split responsibilities into backend services, Krema command/event bridge, frontend bridge/store, and desktop-only capabilities such as tray, dialogs, or autostart.

### 2. Design command and event contracts

- Define command names, DTOs, and error surfaces before wiring UI components.
- Return serializable records or DTOs. Do not leak repositories, framework exceptions, or persistence entities across IPC.
- Namespace event names consistently, for example `task:progress`, `sync:status`, or `window:ready`.
- Plan listener teardown for every long-lived event subscription.

### 3. Implement backend logic

- Keep domain workflows in plain services that are independently testable.
- Use command methods for user-triggered operations such as queries, mutations, configuration changes, or file/dialog requests.
- Use event emission for progress reporting, task streams, notifications, and background state changes.
- For long-running work, avoid blocking the UI bootstrap thread. Prefer virtual threads or structured concurrency when the project targets Java 21+ or Java 25.
- Match plugin versions to the core Krema dependency instead of mixing arbitrary versions.

### 4. Implement frontend integration

- Create one typed transport layer around `window.krema`.
- Convert raw bridge payloads into app state inside stores, queries, or adapters, not inside presentation components.
- Guard browser-only or desktop-only code paths if the frontend can also run outside Krema during development.
- Remove listeners on unmount or teardown and expose explicit unsubscribe handles in shared utilities.

### 5. Wire desktop capabilities

- Add tray, autostart, notifications, clipboard, shell/file reveal, dialogs, secure storage, or SQLite only when the use case requires them.
- Check `krema.toml` permissions before using native features.
- Keep OS-specific paths, packaging rules, and startup behavior out of UI components.

### 6. Validate end to end

- Verify that frontend dev/build commands align with `krema.toml` and the Java bootstrap.
- Test command round-trips, event delivery, error propagation, and listener cleanup.
- Test tray/menu actions, file access, startup behavior, and packaging on the target OS.
- If packaged builds fail while dev mode works, compare asset loading, permissions, plugin availability, and environment-specific paths first.

## Common Requests

- "Create a Krema desktop app from scratch": output in order build config, `krema.toml`, Java entry, command/service structure, frontend bridge, then packaging notes.
- "Integrate Spring Boot with Krema": keep Spring Boot for DI, config, logging, and services; expose a thin Krema bridge layer instead of smearing desktop concerns across all beans.
- "Implement streaming tasks or live progress": use commands to start or cancel work and events to stream progress or partial results back to the UI.
- "Add tray, autostart, or SQLite support": inspect permission and plugin requirements first, then wire one native capability at a time with explicit lifecycle handling.
- "Fix broken invoke/on calls": inspect command registration, naming, payload shape, startup wiring, dev URL, permissions, and plugin mismatches.

## Rules

- Read local build and config files before assuming CLI usage, dependency coordinates, or plugin versions.
- Preserve the project's existing architecture when extending an app; do not rewrite the stack unless the user explicitly asks for it.
- Keep command interfaces explicit, typed, and small.
- Prefer incremental patches over broad rewrites in existing desktop apps.
- When uncertainty remains, open [project-patterns.md](references/project-patterns.md) and call out which details are version-sensitive.
