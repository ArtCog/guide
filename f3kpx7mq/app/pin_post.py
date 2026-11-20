"""Write the channel's pinned post: who it is for, how to find a guide, the 10 newest guides from videos, all guides.

Run after build_index.py (it reads content/index.json, so only listed guides get in: no drafts, no future publishAt):
    C:\\Users\\magme\\AppData\\Local\\Programs\\Python\\Python313\\python.exe pin_post.py
Writes C:\\Projects\\Distribution\\telegram\\posts\\pinned-guides\\post-latest.txt; Arthur copies it into the pin.
Bold is Telegram's **...**; no long dashes and no colons mid-sentence (Arthur's rules for his texts), so a list line
uses meta «pinTitle» (how the video named it, no colon) or else the name before a title's colon.
"""
from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUT = Path(r"C:\Projects\Distribution\telegram\posts\pinned-guides\post-latest.txt")
LATEST = 10

HEAD = """**Пришли из моего ролика в Instagram или TikTok? Вам сюда 👋**

В роликах я показываю полезные инструменты с ИИ, а **гайды по установке к ним лежат здесь**. В гайде пошаговая установка и часто готовый промпт для вашего агента.

**Как найти свой гайд.** Нажмите на свой ролик в списке ниже, и гайд откроется. Не нашли? Внизу ссылка на все гайды.

Всё бесплатно, нужна только подписка на этот канал 🙌

**Последние гайды из роликов**"""


def appeared(m: dict) -> datetime:
    at = m.get("publishAt") or m["date"] + "T00:00+00:00"
    return datetime.fromisoformat(at)


def main() -> int:
    data = json.loads((ROOT / "content" / "index.json").read_text(encoding="utf-8"))
    bot = data["site"]["bot"]
    now = datetime.now(timezone.utc)
    guides = [m for m in data["materials"] if m.get("fromVideo") and not m.get("draft") and appeared(m) <= now]
    guides.sort(key=appeared, reverse=True)
    lines = [f"{m.get('pinTitle') or m['title'].split(':')[0].strip()} 👉 https://t.me/{bot}?startapp={m['slug']}" for m in guides[:LATEST]]
    # the last line opens the app's «Гайды» tab (Arthur, 2026-11-20)
    text = f"{HEAD}\n\n" + "\n\n".join(lines) + f"\n\n**Все гайды** 👉 https://t.me/{bot}?startapp=guides\n"
    assert "\u2014" not in text and "\u2013" not in text, "long dash in the pinned post"
    OUT.write_text(text, encoding="utf-8", newline="\n")
    print(f"{OUT}: {len(lines)} guides")
    return 0


if __name__ == "__main__":
    sys.exit(main())
