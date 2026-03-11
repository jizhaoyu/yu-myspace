## Project Skills

This repository contains project-local skills under `./skills`.

### Discovery

- Before concluding that no project-local skill exists, scan `./skills/*/SKILL.md`.
- Treat each child directory that contains a `SKILL.md` file as an available local skill.
- Use the skill frontmatter fields `name` and `description` as the discovery metadata.
- When both a global skill and a project-local skill apply, prefer the project-local skill for repository-specific work.

### Available project-local skills

- `krema-desktop-expert`: Expert workflow for planning, scaffolding, implementing, debugging, and reviewing Krema desktop applications with a Java backend and web frontend. Use when the task involves Krema, `@KremaCommand`, `window.krema.invoke`, `window.krema.on`, `krema.toml`, system tray or autostart integration, native plugin wiring, or packaging a Java desktop app with React, Vue, Angular, Svelte, or plain web UI. (file: `./skills/krema-desktop-expert/SKILL.md`)

### How to use project-local skills

- If the user names a project-local skill, open its `SKILL.md` and follow it for that turn.
- If the task clearly matches a project-local skill description, use that skill even if the user did not name it explicitly.
- Resolve relative paths mentioned by a local skill from that skill's directory first.
- Load only the minimum necessary content from `references/`, `scripts/`, or `assets/`.
