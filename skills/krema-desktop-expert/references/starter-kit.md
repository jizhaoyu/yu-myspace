# Starter Kit

Use this reference when the user wants more than advice and needs runnable starter material.

## Included resources

- `scripts/init_krema_react_app.py`: copies the bundled React starter and replaces project metadata.
- `scripts/render_project_brief.py`: generates a Markdown implementation brief or prompt for a specific app.
- `assets/react-starter/`: text-based Krema starter project modeled after the official React demo structure.

## Recommended workflow

1. Run the scaffold script to create a clean project directory.
2. Review `pom.xml`, `package.json`, `krema.toml`, and the generated Java package.
3. Add plugins only after the base bridge works.
4. Use the brief renderer when you want a deterministic prompt or handoff document for the generated project.

## Scaffold command

```bash
python skills/krema-desktop-expert/scripts/init_krema_react_app.py \
  --output D:\work\signal-desk \
  --app-name signal-desk \
  --title "Signal Desk" \
  --java-package com.example.signaldesk
```

Important generated files:

- `pom.xml`
- `package.json`
- `krema.toml`
- `src-java/<java-package>/Main.java`
- `src-java/<java-package>/bridge/AppCommands.java`
- `src-java/<java-package>/service/TaskService.java`
- `src/App.tsx`
- `src/lib/krema.ts`

## What the starter already demonstrates

- thin `@KremaCommand` bridge methods
- typed runtime snapshot loading
- backend task events for queue, progress, and completion
- virtual-thread background execution
- frontend event subscription and task list updates
- a browser-safe preview mode for UI work before the desktop shell is running

## Intentional gaps

The template is meant to be extended, not treated as a final product. It does not pre-install database, tray, autostart, or secure-storage plugins. Add those only when the project really needs them and after confirming the target Krema version.
