# Krema Project Patterns

This reference captures stable implementation patterns for Krema desktop work. It is based on the official `krema-build/krema` README as verified on 2026-03-11 and should be used together with the local project's actual dependency versions.

## What Krema Gives You

- Java backend plus web frontend.
- System webviews instead of a bundled browser.
- `@KremaCommand` for type-safe IPC from frontend to Java.
- `window.krema.invoke()` for request/response calls from the UI.
- `window.krema.on()` for backend-to-frontend events.
- `krema.toml` as the project configuration file.
- Maven plus npm as the standard toolchain shape.
- Java 25+ as the baseline according to the official README.

## Default Delivery Order

When the user asks for a full Krema app, build in this order:

1. Confirm build tools, Java version, frontend framework, and target OSes.
2. Create or inspect `pom.xml` and `package.json`.
3. Define `krema.toml` so frontend commands, dev URL, app identifier, and permissions are explicit.
4. Wire the Java entrypoint and register command objects.
5. Implement services first, then expose thin Krema command adapters.
6. Add a typed frontend bridge and state management.
7. Add native capabilities or plugins only after the core command/event loop works.
8. Validate both `krema dev` and the packaged build path.

## Recommended Layering

Use this as a pattern, not a forced directory layout:

- `app` or `bootstrap`: Java entrypoint and Krema app startup.
- `desktop` or `bridge`: `@KremaCommand` classes, event emitters, tray/menu wiring.
- `service`: domain workflows and orchestration.
- `repository` or `persistence`: database and file persistence concerns.
- `frontend/src/lib/krema.ts`: typed wrappers around `invoke` and `on`.
- `frontend/src/store` or `frontend/src/features`: UI state and feature modules.

Keep the bridge replaceable. If most of the logic sits inside command classes, the app becomes hard to test and hard to reuse outside the desktop shell.

## Command and Event Pattern

Apply this split consistently:

- Command: initiate work, fetch a snapshot, update data, open a dialog, or change local configuration.
- Event: report progress, stream partial output, push notifications, or broadcast state changes.

Useful contract rules:

- Use stable names and do not overload one command with many unrelated modes.
- Prefer DTOs or Java records as payloads.
- Normalize errors before they cross the bridge.
- Reserve event names by domain, for example `chat:*`, `sync:*`, `window:*`, `queue:*`.
- Always define listener cleanup on the frontend.

## Spring Boot Integration Pattern

When a project combines Spring Boot with Krema:

- Let Spring Boot own dependency injection, configuration, logging, and services.
- Keep Krema responsible for desktop runtime, command registration, native APIs, and event transport.
- Inject Spring-managed services into bridge objects instead of duplicating logic.
- Keep startup order obvious. If both frameworks initialize application state, document which one boots first and where the shared application context comes from.
- Do not let web-controller patterns leak into desktop bridge classes unless the project explicitly reuses HTTP endpoints.

## Native Capability Checklist

Before adding a desktop feature, verify:

- The feature is needed by the user flow.
- The required permission exists in `krema.toml`.
- The plugin or native API exists for the project's Krema version.
- Startup and shutdown lifecycle are defined.
- The frontend has a fallback or clear failure state when the feature is unavailable.

Common features mentioned in the official README:

- window management
- menus
- dialogs
- notifications
- clipboard
- system tray
- global shortcuts
- drag and drop
- secure storage
- shell integration
- screen information
- HTTP client

Plugins mentioned in the official README:

- `krema-plugin-sql`
- `krema-plugin-websocket`
- `krema-plugin-upload`
- `krema-plugin-positioner`
- `krema-plugin-autostart`

Pin versions carefully. Plugin mismatches are a common failure mode in early-stage frameworks.

## Troubleshooting Matrix

### `window.krema.invoke()` fails

Check:

- the command object is actually registered during app startup
- the method carries `@KremaCommand`
- the frontend command name matches the exposed method name
- the payload keys match the Java parameter names or DTO shape
- the command returns a serializable result

### `window.krema.on()` never receives events

Check:

- the backend emits the exact event name the frontend subscribes to
- the listener is registered before the first event fires
- the event payload is serializable
- the listener is not removed immediately by component lifecycle bugs

### App works in browser dev mode but not in desktop mode

Check:

- dev URL in `krema.toml`
- frontend dev server port
- browser-only assumptions in frontend code
- code paths that access `window.krema` without guards

### App works in dev mode but packaged build is blank or broken

Check:

- frontend build command and output path
- packaged asset loading versus dev URL loading
- OS-specific file or storage paths
- missing permissions
- plugin availability in packaged runtime

### Native feature compiles but does not work

Check:

- permission entry in `krema.toml`
- plugin dependency coordinates and version alignment
- OS support for the specific feature
- lifecycle timing, especially tray and window features during startup
