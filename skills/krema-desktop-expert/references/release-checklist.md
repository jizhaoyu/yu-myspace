# Release Checklist

Use this checklist before calling a Krema app production-ready.

## Runtime alignment

- Confirm `krema.toml` matches the Java main class and frontend dev/build commands.
- Confirm the frontend output directory aligns with the packaged asset path.
- Confirm Java and Krema versions are pinned intentionally.

## Bridge integrity

- Test every `@KremaCommand` from the real desktop shell, not only in browser preview.
- Verify event names are stable and listeners unsubscribe correctly.
- Normalize backend errors before they cross IPC.

## Native capability review

- Verify each native permission in `krema.toml`.
- Test every plugin on the actual target OS.
- Check tray, notifications, dialogs, clipboard, and autostart behavior after packaging.

## Packaging review

- Compare dev mode and packaged mode for asset loading and file paths.
- Check icon, identifier, copyright, and version metadata.
- Smoke-test cold start, relaunch, and update scenarios.

## Operational review

- Add structured logging before investigating packaging-only bugs.
- Verify long-running tasks can be cancelled cleanly.
- Confirm shutdown does not strand background threads or native listeners.
