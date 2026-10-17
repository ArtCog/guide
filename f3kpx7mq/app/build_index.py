"""Build content/index.json for the knowledge-base app from content/site.json and content/<slug>/meta.json.

Run after adding or editing a material:
    C:\\Users\\magme\\AppData\\Local\\Programs\\Python\\Python313\\python.exe build_index.py

Fails loudly (exit code 1, one line per problem) instead of writing a broken index.
"""
from __future__ import annotations

import json
import re
import sys
from datetime import date, datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent
CONTENT = ROOT / "content"
TYPES = {"гайд", "скилл", "статья", "сайт", "промпты", "подборка", "установщик"}
TEXT_EXT = {".md", ".txt", ".json", ".csv"}
SLUG = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
DASHES = ("\u2014", "\u2013")  # viewer texts never use long dashes


def kind_of(name: str) -> str:
    ext = Path(name).suffix.lower()
    return "text" if ext in TEXT_EXT else "zip" if ext == ".zip" else "file"


def check_text(where: str, value: object, problems: list[str]) -> None:
    if isinstance(value, str) and any(d in value for d in DASHES):
        problems.append(f"{where}: long dash in viewer text, use a comma, colon or full stop")


def load_material(folder: Path, sections: set[str], problems: list[str]) -> dict | None:
    slug = folder.name
    where = f"content/{slug}/meta.json"
    if not SLUG.match(slug):
        problems.append(f"content/{slug}: folder name must be lowercase latin, digits and hyphens")
        return None
    try:
        meta = json.loads((folder / "meta.json").read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as e:
        problems.append(f"{where}: cannot read ({e})")
        return None

    for key in ("title", "section", "type", "date", "summary"):
        if not meta.get(key):
            problems.append(f"{where}: missing «{key}»")
    if meta.get("section") and meta["section"] not in sections:
        problems.append(f"{where}: unknown section «{meta['section']}», known: {', '.join(sorted(sections))}")
    if meta.get("type") and meta["type"] not in TYPES:
        problems.append(f"{where}: unknown type «{meta['type']}», known: {', '.join(sorted(TYPES))}")
    try:
        date.fromisoformat(meta.get("date", ""))
    except ValueError:
        problems.append(f"{where}: date must be YYYY-MM-DD")
    if "new" in meta and not isinstance(meta["new"], bool):
        problems.append(f"{where}: «new» must be true or false")

    for key in ("title", "summary", "agent"):
        check_text(f"{where} {key}", meta.get(key), problems)

    if meta.get("type") == "сайт":
        url = urlparse(meta.get("url", ""))
        if url.scheme != "https" or not url.netloc:
            problems.append(f"{where}: a site needs an https «url»")
        else:
            meta.setdefault("domain", url.netloc.removeprefix("www."))

    files = meta.get("files", [])
    for i, f in enumerate(files):
        fw = f"{where} files[{i}]"
        if not f.get("name"):
            problems.append(f"{fw}: missing «name»")
            continue
        check_text(fw, f.get("about"), problems)
        f.setdefault("kind", kind_of(f["name"]))
        target = (ROOT / f["url"]) if f.get("url") else (folder / f["name"])
        if not target.resolve().is_file():
            problems.append(f"{fw}: file not found at {target}")
    if meta.get("agentFile") and not any(f.get("name") == meta["agentFile"] for f in files):
        problems.append(f"{where}: agentFile «{meta['agentFile']}» is not in files")

    clip = meta.get("clip")
    if clip:
        for key in ("src", "poster", "still"):
            if not clip.get(key) or not (folder / clip[key]).is_file():
                problems.append(f"{where}: clip «{key}» file missing in the folder")

    if (folder / "cover.jpg").is_file():
        meta["cover"] = "cover.jpg"
    meta["slug"] = slug
    return meta


def main() -> int:
    problems: list[str] = []
    site = json.loads((CONTENT / "site.json").read_text(encoding="utf-8"))
    sections = {s["id"] for s in site["sections"]}
    for s in site["sections"]:
        check_text("content/site.json section", s.get("title"), problems)

    materials = []
    for folder in sorted(p for p in CONTENT.iterdir() if p.is_dir()):
        if not (folder / "meta.json").is_file():
            problems.append(f"content/{folder.name}: no meta.json")
            continue
        meta = load_material(folder, sections, problems)
        if meta:
            materials.append(meta)

    if problems:
        print("index.json NOT written:", file=sys.stderr)
        for p in problems:
            print("  " + p, file=sys.stderr)
        return 1

    materials.sort(key=lambda m: m["title"].lower())
    materials.sort(key=lambda m: m["date"], reverse=True)  # newest first, A to Z within a day
    index = {"generated": datetime.now(timezone.utc).isoformat(timespec="seconds"), "site": site, "materials": materials}
    out = CONTENT / "index.json"
    out.write_text(json.dumps(index, ensure_ascii=False, indent=1) + "\n", encoding="utf-8", newline="\n")
    print(f"content/index.json: {len(materials)} materials")
    for m in materials:
        print(f"  {m['date']}  {m['section']:<12} {m['slug']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
