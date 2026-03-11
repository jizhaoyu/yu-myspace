#!/usr/bin/env python3
"""
Render a reusable Krema implementation brief or prompt as Markdown.
"""

from __future__ import annotations

import argparse
import textwrap
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate a Krema implementation brief.")
    parser.add_argument("--app-name", required=True, help="Project slug, for example signal-desk.")
    parser.add_argument("--title", help="Human-facing application title.")
    parser.add_argument("--description", required=True, help="One-sentence product description.")
    parser.add_argument("--java-package", required=True, help="Java package used by the backend.")
    parser.add_argument("--identifier", required=True, help="Desktop app identifier.")
    parser.add_argument("--frontend", default="React + TypeScript + Vite", help="Frontend stack line.")
    parser.add_argument("--krema-version", default="0.3.2", help="Pinned Krema version for the brief.")
    parser.add_argument("--feature", action="append", default=[], help="Repeat for each feature requirement.")
    parser.add_argument("--note", action="append", default=[], help="Repeat for extra delivery notes.")
    parser.add_argument("--output", help="Write the Markdown to a file instead of stdout.")
    return parser.parse_args()


def render_markdown(args: argparse.Namespace) -> str:
    title = args.title or args.app_name.replace("-", " ").title()
    features = args.feature or [
        "typed IPC commands and backend events",
        "task queue or background job workflow",
        "settings persistence and desktop-safe error handling",
    ]
    notes = args.note or [
        "keep `@KremaCommand` classes thin and move business logic into services",
        "centralize `window.krema.invoke()` and `window.krema.on()` in a typed frontend bridge",
        "deliver code in the order: build config, backend bootstrap, command/service layer, frontend bridge, UI shell",
    ]

    feature_lines = "\n".join(f"- {item}" for item in features)
    note_lines = "\n".join(f"- {item}" for item in notes)

    return textwrap.dedent(
        f"""\
        # {title} Implementation Brief

        ## Project

        - App name: `{args.app_name}`
        - Title: `{title}`
        - Description: {args.description}
        - Java package: `{args.java_package}`
        - App identifier: `{args.identifier}`

        ## Required Stack

        - Java 25
        - Krema `{args.krema_version}`
        - {args.frontend}
        - Maven for backend build

        ## Core Features

        {feature_lines}

        ## Delivery Rules

        {note_lines}

        ## Prompt

        You are building a Krema desktop application named `{title}`. Use Java 25 and Krema `{args.krema_version}` for the desktop/backend layer and `{args.frontend}` for the frontend. Place Java code under `{args.java_package}` and use `{args.identifier}` as the desktop identifier. Implement the requested features, keep desktop bridge code thin, stream progress through backend events when work is long-running, and return serializable DTOs across IPC.
        """
    ).strip() + "\n"


def main() -> int:
    args = parse_args()
    markdown = render_markdown(args)

    if args.output:
        output_path = Path(args.output).resolve()
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(markdown, encoding="utf-8")
        print(f"[OK] Wrote brief to {output_path}")
    else:
        print(markdown)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
