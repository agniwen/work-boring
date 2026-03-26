#!/usr/bin/env python3
"""
Validate a skill folder without external Python dependencies.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

ALLOWED_PROPERTIES = {"name", "description", "license", "allowed-tools", "metadata"}
MAX_SKILL_NAME_LENGTH = 64
TOP_LEVEL_KEY_PATTERN = re.compile(r"^([A-Za-z0-9_-]+):(.*)$")


def extract_frontmatter(content: str) -> str:
    if not content.startswith("---"):
        raise ValueError("No YAML frontmatter found")

    match = re.match(r"^---\r?\n(.*?)\r?\n---", content, re.DOTALL)
    if not match:
        raise ValueError("Invalid frontmatter format")

    return match.group(1)


def unquote_scalar(value: str) -> str:
    value = value.strip()

    if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
        return value[1:-1]

    return value


def parse_top_level_frontmatter(frontmatter_text: str) -> dict[str, str | None]:
    fields: dict[str, str | None] = {}
    lines = frontmatter_text.splitlines()
    index = 0

    while index < len(lines):
        line = lines[index]

        if not line.strip() or line.lstrip().startswith("#"):
            index += 1
            continue

        if line[:1].isspace():
            raise ValueError(f"Unexpected indentation in frontmatter: {line!r}")

        match = TOP_LEVEL_KEY_PATTERN.match(line)
        if not match:
            raise ValueError(f"Invalid frontmatter line: {line!r}")

        key = match.group(1)
        raw_value = match.group(2).strip()

        if raw_value in {"|", ">", "|-", ">-", "|+", ">+"}:
            block_lines: list[str] = []
            index += 1

            while index < len(lines):
                next_line = lines[index]

                if next_line and not next_line[:1].isspace():
                    break

                block_lines.append(next_line.lstrip())
                index += 1

            if raw_value.startswith(">"):
                value = " ".join(line for line in block_lines if line).strip()
            else:
                value = "\n".join(block_lines).strip()

            fields[key] = value
            continue

        if raw_value:
            fields[key] = unquote_scalar(raw_value)
            index += 1
            continue

        # Empty top-level value means nested YAML. We do not fully parse it here, but still allow
        # the property and continue scanning until the next top-level key.
        fields[key] = None
        index += 1

        while index < len(lines):
            next_line = lines[index]

            if not next_line.strip():
                index += 1
                continue

            if not next_line[:1].isspace():
                break

            index += 1

    return fields


def validate_skill(skill_path: Path) -> tuple[bool, str]:
    skill_md = skill_path / "SKILL.md"
    if not skill_md.exists():
        return False, "SKILL.md not found"

    try:
        frontmatter_text = extract_frontmatter(skill_md.read_text(encoding="utf-8"))
        frontmatter = parse_top_level_frontmatter(frontmatter_text)
    except ValueError as error:
        return False, str(error)

    unexpected_keys = set(frontmatter.keys()) - ALLOWED_PROPERTIES
    if unexpected_keys:
        allowed = ", ".join(sorted(ALLOWED_PROPERTIES))
        unexpected = ", ".join(sorted(unexpected_keys))
        return (
            False,
            f"Unexpected key(s) in SKILL.md frontmatter: {unexpected}. Allowed properties are: {allowed}",
        )

    name = frontmatter.get("name")
    if name is None:
        return False, "Missing or invalid 'name' in frontmatter"

    if not name:
        return False, "Name cannot be empty"

    if not re.match(r"^[a-z0-9-]+$", name):
        return (
            False,
            f"Name '{name}' should be hyphen-case (lowercase letters, digits, and hyphens only)",
        )

    if name.startswith("-") or name.endswith("-") or "--" in name:
        return (
            False,
            f"Name '{name}' cannot start/end with hyphen or contain consecutive hyphens",
        )

    if len(name) > MAX_SKILL_NAME_LENGTH:
        return (
            False,
            f"Name is too long ({len(name)} characters). Maximum is {MAX_SKILL_NAME_LENGTH} characters.",
        )

    description = frontmatter.get("description")
    if description is None:
        return False, "Missing or invalid 'description' in frontmatter"

    if not description:
        return False, "Description cannot be empty"

    if "<" in description or ">" in description:
        return False, "Description cannot contain angle brackets (< or >)"

    if len(description) > 1024:
        return (
            False,
            f"Description is too long ({len(description)} characters). Maximum is 1024 characters.",
        )

    return True, "Skill is valid!"


def main(argv: list[str]) -> int:
    raw_paths = [arg for arg in argv[1:] if arg != "--"]

    if not raw_paths:
        print("Usage: python3 scripts/validate-skill.py <skill_directory> [<skill_directory> ...]")
        return 1

    exit_code = 0

    for raw_path in raw_paths:
        skill_path = Path(raw_path)
        valid, message = validate_skill(skill_path)
        prefix = "[OK]" if valid else "[ERROR]"
        print(f"{prefix} {skill_path}: {message}")

        if not valid:
            exit_code = 1

    return exit_code


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
