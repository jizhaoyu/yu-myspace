#!/usr/bin/env python3
"""
Scaffold a Krema desktop application from the bundled React starter.

Example:
    python scripts/init_krema_react_app.py \
        --output D:\\work\\signal-desk \
        --app-name signal-desk \
        --title "Signal Desk" \
        --java-package com.example.signaldesk
"""

from __future__ import annotations

import argparse
import datetime as dt
import shutil
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Create a Krema desktop app from the local starter template.")
    parser.add_argument("--output", required=True, help="Directory to create.")
    parser.add_argument("--app-name", required=True, help="Slug-like app name, for example signal-desk.")
    parser.add_argument("--title", help="Human-facing desktop window title.")
    parser.add_argument("--description", help="Short app description.")
    parser.add_argument("--version", default="0.1.0", help="Initial app version.")
    parser.add_argument("--java-package", required=True, help="Java package for generated sources.")
    parser.add_argument("--group-id", help="Maven groupId. Defaults to the Java package.")
    parser.add_argument("--artifact-id", help="Maven artifactId. Defaults to app-name.")
    parser.add_argument("--identifier", help="Desktop app identifier. Defaults to the Java package.")
    parser.add_argument("--krema-version", default="0.3.2", help="Krema version to pin in the starter.")
    parser.add_argument("--dev-port", type=int, default=5174, help="Frontend dev server port.")
    parser.add_argument("--force", action="store_true", help="Replace the output directory if it already exists.")
    return parser.parse_args()


def title_case(value: str) -> str:
    parts = value.replace("_", "-").split("-")
    return " ".join(part.capitalize() for part in parts if part)


def ensure_package(value: str) -> str:
    segments = [segment for segment in value.split(".") if segment]
    if len(segments) < 2:
        raise ValueError("java-package must contain at least two segments, for example com.example.app")
    for segment in segments:
        if not segment.replace("_", "").isalnum() or segment[0].isdigit():
            raise ValueError(f"Invalid java package segment: {segment}")
    return ".".join(segments)


def copy_template(template_dir: Path, output_dir: Path, force: bool) -> None:
    if output_dir.exists():
        if not force:
            raise FileExistsError(f"Output already exists: {output_dir}")
        shutil.rmtree(output_dir)
    shutil.copytree(template_dir, output_dir)


def move_java_sources(output_dir: Path, java_package: str) -> None:
    package_root = output_dir / "src-java" / "_package_"
    target_root = output_dir / "src-java" / Path(*java_package.split("."))
    target_root.parent.mkdir(parents=True, exist_ok=True)

    if target_root.exists():
        raise FileExistsError(f"Package path already exists: {target_root}")

    shutil.move(str(package_root), str(target_root))


def replace_tokens(output_dir: Path, replacements: dict[str, str]) -> None:
    for path in sorted(output_dir.rglob("*"), key=lambda item: len(str(item)), reverse=True):
        if path.is_dir():
            continue
        content = path.read_text(encoding="utf-8")
        for token, value in replacements.items():
            content = content.replace(token, value)
        path.write_text(content, encoding="utf-8")


def main() -> int:
    args = parse_args()
    skill_dir = Path(__file__).resolve().parent.parent
    template_dir = skill_dir / "assets" / "react-starter"
    output_dir = Path(args.output).resolve()

    java_package = ensure_package(args.java_package)
    app_title = args.title or title_case(args.app_name)
    description = args.description or f"{app_title} desktop application built with Krema and React."
    group_id = args.group_id or java_package
    artifact_id = args.artifact_id or args.app_name
    identifier = args.identifier or java_package
    main_class = f"{java_package}.Main"
    dev_url = f"http://localhost:{args.dev_port}"

    replacements = {
        "__APP_NAME__": args.app_name,
        "__APP_TITLE__": app_title,
        "__APP_DESCRIPTION__": description,
        "__APP_VERSION__": args.version,
        "__GROUP_ID__": group_id,
        "__ARTIFACT_ID__": artifact_id,
        "__JAVA_PACKAGE__": java_package,
        "__APP_IDENTIFIER__": identifier,
        "__KREMA_VERSION__": args.krema_version,
        "__FRONTEND_DEV_PORT__": str(args.dev_port),
        "__FRONTEND_DEV_URL__": dev_url,
        "__MAIN_CLASS__": main_class,
        "__COPYRIGHT_YEAR__": str(dt.date.today().year),
    }

    copy_template(template_dir, output_dir, args.force)
    move_java_sources(output_dir, java_package)
    replace_tokens(output_dir, replacements)

    print(f"[OK] Created Krema starter at {output_dir}")
    print(f"[OK] Java package: {java_package}")
    print(f"[OK] App identifier: {identifier}")
    print("")
    print("Next steps:")
    print("1. Install frontend dependencies with `npm install`.")
    print("2. Review `pom.xml` and `krema.toml` for project-specific adjustments.")
    print("3. Run the frontend with `npm run dev` and the desktop shell with `krema dev`.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
