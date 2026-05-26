# Setup-инструкция для Claude Code

Этот файл — инструкция, которой Claude Code следует, когда пользователь говорит **"Сделай setup проекта"**. Цель — чтобы в итоге пользователю осталось только вписать свой ElevenLabs API key и сразу начать работу.

---

## Что мы здесь собираем

Полноценную AI-видео-студию, которая умеет два workflow:

1. **Edit-workflow:** Сырое видео → транскрипция → нарезка → motion graphics → финальный рендер.
2. **Pure-animation-workflow:** Анимационные ролики для сайта, промо, объяснительные видео — даже без исходного видео вообще.

Инструменты:
- **Video-Use** — нарезка, транскрипция (ElevenLabs Scribe), субтитры, self-eval
- **Hyperframes** — HTML-based motion-graphics композиции с GSAP, рендер через FFmpeg

---

## Единственное требование к пользователю

**ElevenLabs API key**. Бесплатно получить можно тут: https://elevenlabs.io/app/settings/api-keys (free-tier хватит для первых тестов).

Всё остальное (Node, Python, FFmpeg, uv, Git) ставишь ты, Claude — если чего-то нет, выдаёшь пользователю точную install-команду под его ОС.

---

## Что Claude делает при setup — фаза за фазой

> **Важно:** Будь идемпотентным. Если шаг уже выполнен (директория есть, npm уже установил, video-use уже клонирован), пропусти его вместо перезаписи. Если предыдущий setup-прогон частично завис — чини только то, чего не хватает.

### Фаза 1 — Pre-flight (проверка тулзов)

OS определяй автоматически (`process.platform` / `uname` / `$IsWindows`). Не спрашивай пользователя про WSL vs native.

Проверь эти тулзы с минимальными версиями:

| Тулз       | Min-версия  | Обязательно? |
|------------|-------------|----------|
| `node`     | ≥ 22        | ✓        |
| `npm`      | ≥ 10        | ✓        |
| `python`   | ≥ 3.11      | ✓        |
| `uv`       | latest      | ✓        |
| `ffmpeg`   | ≥ 4.x       | ✓        |
| `ffprobe`  | ≥ 4.x       | ✓        |
| `git`      | ≥ 2.30      | ✓        |
| `git-lfs`  | latest      | опционально (только если brand-assets раздаются через LFS) |
| `yt-dlp`   | latest      | опционально (только для YouTube-загрузок как сырой input) |

Если чего-то нет, выдай пользователю **точную install-команду под его ОС** и подожди подтверждения, что он установил (или что он установит позже, а ты пока продолжай, насколько это возможно):

**Windows:**
```powershell
winget install OpenJS.NodeJS.LTS Python.Python.3.12 Gyan.FFmpeg astral-sh.uv Git.Git
```

**macOS:**
```bash
brew install node@22 python@3.12 ffmpeg uv git
```

**Linux (Debian/Ubuntu):**
```bash
sudo apt update && sudo apt install -y nodejs npm python3.12 ffmpeg git
curl -LsSf https://astral.sh/uv/install.sh | sh
# Node 22+ через NodeSource, если дистрибутивная версия слишком старая:
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt install -y nodejs
```

### Фаза 2 — План на согласование

Прежде чем что-либо устанавливать: покажи пользователю **коротко** (максимум 7 буллетов), что ты сейчас будешь делать, и подожди "ОК / поехали". Пример:

```
План:
1. Pre-flight проверка тулзов
2. Создание структуры папок + обязательных файлов (включая generic brand-плейсхолдер)
3. Установка Hyperframes (npm install) — skills из node_modules слинковать
4. Клонирование Video-Use в проект + uv sync
5. ElevenLabs key — либо ты сам впишешь в .env (рекомендуется), либо передашь мне в чате
6. Brand Guidelines — если есть ZIP из Claude Design, распакую в brand-guidelines/default/
7. Верификация (hyperframes doctor) + summary
```

### Фаза 3 — Scaffold

Создай следующую структуру (см. целевая структура папок ниже) и запиши все обязательные файлы (см. дальше).

### Фаза 4 — Установка Hyperframes + линковка skills

```bash
npm install
```

Это установит `hyperframes`, `@hyperframes/core`, `@hyperframes/shader-transitions`, `puppeteer-core` из созданного `package.json`.

Затем **поставляемые в `node_modules/hyperframes/dist/skills/` skills (`hyperframes`, `gsap`, `hyperframes-cli`) слинковать как junction (Windows) или symlink (macOS/Linux) в `.claude/skills/<name>`.** Так они становятся локально доступны в проекте и автоматически обновляются вместе с `npm update`.

**Важно:** Не использовать `npx skills add heygen-com/hyperframes` и подобное — это тянет неавторизованный код с GitHub и блокируется Claude-Code auto-mode классификатором. Поставляемые в npm-пакете skills функционально эквивалентны.

**Кросс-платформенная линковка:**

Windows (PowerShell, админ не нужен благодаря junction):
```powershell
foreach ($name in @("hyperframes","gsap","hyperframes-cli")) {
  $target = ".claude\skills\$name"
  if (Test-Path $target) { Remove-Item $target -Recurse -Force }
  New-Item -ItemType Junction -Path $target -Target "node_modules\hyperframes\dist\skills\$name" | Out-Null
}
```

macOS/Linux (bash):
```bash
for name in hyperframes gsap hyperframes-cli; do
  ln -sfn "$(pwd)/node_modules/hyperframes/dist/skills/$name" ".claude/skills/$name"
done
```

### Фаза 5 — Клонирование Video-Use в проект

Video-Use живёт **внутри** проекта в `./video-use/`. Это делает проект self-contained.

```bash
git clone https://github.com/browser-use/video-use ./video-use
cd ./video-use
uv sync
cd ..
```

Затем `./video-use/` слинковать как skill (тот же паттерн, что и выше):

Windows:
```powershell
$target = ".claude\skills\video-use"
if (Test-Path $target) { Remove-Item $target -Recurse -Force }
New-Item -ItemType Junction -Path $target -Target "video-use" | Out-Null
```

macOS/Linux:
```bash
ln -sfn "$(pwd)/video-use" ".claude/skills/video-use"
```

### Фаза 6 — Запросить ElevenLabs key и пробросить его

Спроси пользователя через `AskUserQuestion` один раз про его ElevenLabs key. **Три варианта** — вариант "впиши сам" это security-сознательный (key никогда не попадает в историю чата):

- **"Я сам впишу key в `.env`" (рекомендуется с точки зрения безопасности)** — Claude создаёт оба `.env`-файла пустыми, автоматически открывает `./.env` в редакторе (или показывает путь), ждёт подтверждения что key вписан, потом синхронизирует в `./video-use/.env` без логирования значения.
- "Я передам Claude key напрямую в чате" — Claude пишет его в оба `.env`-файла (вариант для удобства; key при этом попадает в историю чата).
- "Позже — у меня ещё нет ключа" — оба `.env`-файла создать пустыми, setup продолжается, в конце дать явное напоминание.

#### Вариант A — "впишу сам" (РЕКОМЕНДУЕМЫЙ по умолчанию в вопросе)

1. Оба `.env`-файла создать **пустыми** (`ELEVENLABS_API_KEY=` без значения):
   ```powershell
   "ELEVENLABS_API_KEY=" | Set-Content -Encoding utf8 ".env"
   "ELEVENLABS_API_KEY=" | Set-Content -Encoding utf8 "video-use\.env"
   ```
   ```bash
   echo "ELEVENLABS_API_KEY=" > .env
   echo "ELEVENLABS_API_KEY=" > video-use/.env
   chmod 600 .env video-use/.env
   ```
2. Открыть `./.env` в дефолтном редакторе пользователя (best-effort, не падать если не получилось):
   - Windows: `Start-Process notepad .env` (или `code .env`, если VS Code в PATH)
   - macOS: `open -e .env` (или `code .env`)
   - Linux: `xdg-open .env` (или `code .env`)
3. Чётко скажи пользователю:
   > *"Я открыл `./.env`. Впиши свой ElevenLabs key после `ELEVENLABS_API_KEY=`, сохрани, потом скажи "готово" — я синхронизирую его в `./video-use/.env` не логируя значение."*
4. **Активно жди**, пока пользователь не скажет "готово". Затем:
   - Прочитать `./.env`, извлечь значение `ELEVENLABS_API_KEY`.
   - Проверить, что не пустое и правдоподобное (стандартный формат — ~32–40 символов alphanumeric + возможно префикс `sk_`). Если пусто/неправдоподобно — вежливо переспросить, не цитируя значение.
   - Записать значение в `./video-use/.env` (тот же encoding-setup, что и выше).
   - **Никогда не показывать key в чат-выводе.** Подтверждение только в виде *"Key вписан и синхронизирован в обоих `.env`-файлах."*
5. Если у пользователя не получилось открыть редактор: показать путь `./.env` + он откроет вручную.

#### Вариант B — "напрямую в чате"

Если пользователь передал key: записать его в **оба** `.env`-файла:

1. `./.env` (корень проекта)
2. `./video-use/.env` (Video-Use читает отсюда через `python-dotenv`)

**На Windows: использовать `Set-Content -Encoding utf8`**, иначе PowerShell запишет UTF-16 LE BOM и `python-dotenv` не справится.

```powershell
$key = "<вставленный-ключ>"
"ELEVENLABS_API_KEY=$key" | Set-Content -Encoding utf8 ".env"
"ELEVENLABS_API_KEY=$key" | Set-Content -Encoding utf8 "video-use\.env"
```

```bash
echo "ELEVENLABS_API_KEY=$KEY" > .env
echo "ELEVENLABS_API_KEY=$KEY" > video-use/.env
chmod 600 .env video-use/.env
```

#### Вариант C — "позже"

Создать оба `.env`-файла с пустым значением (`ELEVENLABS_API_KEY=`) и дать в конце явное напоминание, куда вписать key.

Если пользователь впишет key позднее, CLAUDE.md (см. ниже) говорит, что Claude при следующей возможности синхронизирует оба файла.

### Фаза 6b — Спросить про Brand Guidelines и настроить default (ОБЯЗАТЕЛЬНО)

**Почему именно здесь:** `brand-guidelines/default/` после scaffold-а заполнен generic-плейсхолдерами (`colors.md`, `typography.md`, `tone.md`, `SKILL.md`, `logo/`). Технически это работает, но это не **твоя** brand. Сейчас активно спрашиваем, есть ли у пользователя реальная brand — обычно как ZIP, сгенерированный в Claude Design (claude.ai). Если да — заменяем плейсхолдеры; если нет — оставляем плейсхолдер, и вопрос всплывёт снова при первом direct-Hyperframes монтаже.

**Шаг 1 — Вопрос через `AskUserQuestion`:**

> Есть ли у тебя Brand Guidelines, которые я должен установить как default?
> - **Да, у меня есть ZIP из Claude Design** — кладёшь её в корень проекта, я распакую в `brand-guidelines/default/`.
> - **Да, у меня есть brand-файлы (не ZIP)** — назовёшь мне путь, я скопирую в `brand-guidelines/default/`.
> - **Нет, оставить плейсхолдер** — generic default остаётся, можно подложить позже в любой момент.

**Шаг 2 — Если "Да, ZIP":**

1. **Активно ждать и переспрашивать** — никогда не ждать молча. Скажи пользователю:
   > *"Положи ZIP в корень проекта (`./brand.zip` или любое имя). Скажи когда положишь, или пасти путь."*
2. ZIP-detection: искать `*.zip` в корне проекта. При нескольких совпадениях — явно спросить, какая именно.
3. **Backup-проверка:** если `brand-guidelines/default/` содержит только стандартные плейсхолдеры (файлы матчат setup-шаблоны) — можно перезаписать напрямую. Если там что-то другое (второй setup-прогон, пользователь уже что-то менял) — сначала архивировать в `brand-guidelines/_default-backup-<timestamp>/`.
4. **Распаковка:**
   - Удалить пустые плейсхолдер-файлы в `brand-guidelines/default/`.
   - Распаковать ZIP в `brand-guidelines/default/`.
   - Если в ZIP есть top-level folder (например `MyBrand-Design/SKILL.md`, типично для Claude Design skill-экспортов), вытащить содержимое **на один уровень вверх** — `brand-guidelines/default/SKILL.md` в итоге должен быть напрямую доступен, а не `brand-guidelines/default/MyBrand-Design/SKILL.md`.
5. **Верификация:**
   - `brand-guidelines/default/SKILL.md` должен существовать — claude.ai/design требует его для skill-аплоада. Если в ZIP `skill.md` (lowercase) — переименовать.
   - Если опознаются token-файлы (CSS с переменными `--bg`/`--accent`, `colors.md`, `typography.md`, `colors_and_type.css`) — коротко показать пользователю распознанный token-блок ("Brand распознан: bg=#... accent=#... display-font=...").
6. **Удалить ZIP** после успешной распаковки (или предложить пользователю — некоторые предпочитают оставить как бэкап).

**Шаг 3 — Если "Да, файлы (не ZIP)":**

1. Спросить у пользователя путь к source (например `~/Downloads/my-brand/`).
2. Backup-проверка, как выше.
3. Скопировать содержимое в `brand-guidelines/default/`.
4. Верификация, как выше.

**Шаг 4 — Если "Нет":**

`brand-guidelines/default/` остаётся с плейсхолдерами. В summary в Фазе 8 явно упомянуть:
> *"Brand-Guidelines: сейчас плейсхолдеры. Если захочешь подложить свою brand — положи ZIP из Claude Design в корень проекта и скажи мне; распакую в `brand-guidelines/default/`."*

**Замечание про sub-brands:** Дополнительные brands в будущем (для разных клиентов / каналов) идут не в `default/`, а как отдельные папки `brand-guidelines/<name>/`. Пользователь явно выбирает их под конкретный проект.

### Фаза 7 — Верификация

```bash
node --version
ffmpeg -version
python --version
uv --version
npx hyperframes doctor
ls .claude/skills/
```

Ожидаемый результат: все ✓, кроме "Docker" (Docker нужен только для sandboxed renders, не для стандартного workflow — не считать за ошибку).

### Фаза 8 — Итоговая summary

Напиши пользователю короткое резюме:
- Что установлено (Hyperframes, Video-Use, skills)
- Где лежит key (оба места `.env`)
- **Статус brand:**
  - Если в Фазе 6b успешно установлена реальная brand: *"Brand `<распознанное-имя>` активна в `brand-guidelines/default/`. claude.ai/design может загрузить эту папку как skill."*
  - Если пользователь сказал "Нет": *"Brand-Guidelines: сейчас плейсхолдеры. Как только положишь ZIP из Claude Design в корень проекта и скажешь — я распакую в `brand-guidelines/default/`."*
- Как сделать первое видео — например:
  > *"Кинь сырой MP4 в `raw/test/take_001.mp4` и скажи: 'Edit @raw/test/take_001.mp4 в ролик с brand default.'"*

---

## Целевая структура папок

```
.
├── raw/                                    Сырые видео (gitignored)
├── projects/
│   └── example/                            Шаблон для видео-проекта
│       ├── assets/                         Speaker video (keyframe-converted)
│       ├── clips/                          Cut-output от video-use
│       ├── transcripts/                    master.json, master.srt
│       ├── compositions/
│       ├── previews/
│       └── renders/                        final.mp4, final-4k.mp4
├── brand-guidelines/
│   ├── default/                            Fallback brand (плейсхолдер — заменить)
│   │   ├── colors.md
│   │   ├── typography.md
│   │   ├── tone.md
│   │   ├── SKILL.md                        Manifest для claude.ai/design аплоада
│   │   └── logo/
│   └── <своя-sub-brand>/                   Например: другой brand под клиента / канал
├── docs/
│   ├── motion-philosophy.md
│   └── video-editing-workflow.md
├── video-use/                              <— клонируется сюда при setup
├── node_modules/                           (gitignored)
├── .claude/
│   └── skills/                             Junctions/symlinks на hyperframes/, gsap/, hyperframes-cli/, video-use/
├── .env                                    (gitignored) — Single Source of Truth для ключей
├── .env.example                            Шаблон
├── .gitignore
├── CLAUDE.md                               Рабочие правила Claude в этом проекте
├── README.md                               Workflow-документация для людей
├── SETUP.md                                Этот файл
└── package.json                            Hyperframes-зависимости + puppeteer-core
```

---

## Обязательные файлы (Claude создаёт при setup)

### `.env.example`
```env
# Обязательно — для Video-Use транскрипции (ElevenLabs Scribe)
# Получить key: https://elevenlabs.io/app/settings/api-keys
ELEVENLABS_API_KEY=

# Опционально — Whisper fallback при лимите ElevenLabs
OPENAI_API_KEY=

# Опционально — для собственных вызовов Claude API в skills/композициях
ANTHROPIC_API_KEY=
```

### `.gitignore`
Минимум: `.env`, `node_modules/`, `__pycache__/`, `.venv/`, `video-use/.env`, `video-use/.venv/`, `raw/*.mp4`, `raw/*.mov`, `raw/*.mkv`, `projects/*/renders/*.mp4`, `projects/*/previews/*.mp4`, `projects/*/transcripts/*.json`, `projects/*/_bundle_assets/`, `projects/*/assets/speaker.mp4`, `.hyperframes-cache/`, `.DS_Store`, `Thumbs.db`.

### `package.json`
```json
{
  "name": "video-editor",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "preview": "hyperframes preview",
    "doctor": "hyperframes doctor",
    "render": "hyperframes render"
  },
  "dependencies": {
    "hyperframes": "^0.5.5",
    "@hyperframes/core": "^0.5.5",
    "@hyperframes/shader-transitions": "^0.5.5",
    "puppeteer-core": "^23.0.0"
  },
  "engines": { "node": ">=22" }
}
```

### `CLAUDE.md`
Чёткие рабочие правила Claude в этом проекте:
- Video-Use сначала для нарезки/транскрипции, потом Hyperframes для motion graphics
- **План-согласование на русском** перед каждым cut'ом и перед каждой композицией
- Outputs идут в `projects/<name>/renders/`, никогда в корень репо или в `raw/`
- `.env` никогда не коммитить
- Соблюдать конвенцию Brand-Guidelines (см. ниже)
- При multi-scene композициях: параллельные sub-agents (одна сцена на агента), если независимы
- После каждого рендера — self-eval по паттерну `timeline_view`, прежде чем показывать preview
- **Sync `.env`:** Если Claude замечает что `./.env` и `./video-use/.env` разошлись — синхронизировать (корень проекта = источник истины)
- Skill-импорты (Windows-замечание): если junction не получилось создать — импортировать по абсолютному пути

### `README.md`
Workflow-документация для людей. Quickstart, пример-промпты, troubleshooting (FFmpeg-PATH, ElevenLabs-лимит, Studio-port занят).

### `docs/motion-philosophy.md`
- Современно, качественно, чисто, динамично
- Easings: `power3.out` для reveals, `sine.inOut` для loops, **никогда `linear`**
- Anchor-Word-Sync (анимация попадает **с** словом, ±100мс)
- Минимум 3 разных easings на сцену
- **Запрещённые шрифты:** Inter, Roboto, Open Sans, Lato, Poppins, Outfit, Sora, Fraunces, Playfair Display, Cormorant Garamond, Syne, Cinzel, Nunito, Source Sans, PT Sans, Arimo

### `docs/video-editing-workflow.md`
Шаг за шагом от сырого видео до финального рендера. Референс для Claude в течение сессии.

### `brand-guidelines/default/`
- `colors.md` — Hex-коды для `--bg`, `--ink`, `--accent`, `--accent-dim`, `--muted`
- `typography.md` — Display + Data шрифт (Google Fonts ссылка), никаких запрещённых шрифтов
- `tone.md` — 3-5 предложений о стиле речи
- `SKILL.md` — Skill-manifest для аплоада в claude.ai/design (определяет brand-токены, чтобы claude.ai использовал их автоматически)
- `logo/logo-light.svg` и `logo/logo-dark.svg` (плейсхолдеры, пользователь заменит)

---

## Конвенция Brand-Guidelines

Когда пользователь в последующей сессии говорит:

> *"Используй для этого проекта Brand Guidelines из `brand-guidelines/<твоя-brand>/`."*

…Claude читает **все** файлы в этой папке (Hex-коды, имена шрифтов, logo-SVG, tone-of-voice заметки, опционально `motion-philosophy.md`-overrides) и подстраивает стиль нарезки, цвета, типографику, overlays, субтитры и layouts.

Если brand не названа — Claude откатывается на `brand-guidelines/default/`.

---

## Workflow после setup

Что должно быть возможно после успешного setup:

**Edit-workflow** (с сырым видео):
1. Пользователь кладёт сырой MP4 в `raw/<projectname>/`.
2. Пользователь говорит: *"Edit @raw/<projectname>/<file>.mp4 в ролик."*
3. Claude транскрибирует через ElevenLabs Scribe.
4. Claude находит слова-паразиты, паузы, фальстарты, оговорки, retakes.
5. Claude кладёт cut-plan на **русском** (plain language, без markup-сленга) → ждёт OK пользователя.
6. Claude создаёт `projects/<name>/clips/edited.mp4` + `master.srt` + JSON с word-level timestamps.
7. Claude кладёт storyboard для motion graphics (HTML с beats, anchor-словами, типами анимаций) → ждёт OK пользователя.
8. Claude собирает композиции через Hyperframes (одна на сцену, параллельно через sub-agents где имеет смысл).
9. `npx hyperframes preview` → Studio на `localhost:3002`.
10. Итерация по фидбеку.
11. Финальный рендер в `projects/<name>/renders/final.mp4` (1920×1080 / 30fps по умолчанию, 1080×1920 для Shorts).
12. Self-eval через паттерн `timeline_view`.

**Pure-animation-workflow** (без сырого видео):
- Идентичен с шага 7 — пользователь описывает видео, Claude создаёт storyboard и собирает.

---

## Cut-стандарты (обязательно — действует для всех edit-workflow)

Эти правила выработаны итеративно. Они **не обсуждаемы** — Claude должен применять их при каждом cut'е, иначе cut звучит либо торопливо, либо вяло.

### Versprecher-detection (обязательно перед каждым cut'ом)

1. Запустить `pack_transcripts.py --silence-threshold 0.4`.
2. `ffmpeg -af silencedetect=noise=-30dB:duration=0.25` на source.
3. Сравнить — подозрительны:
   - Word-маркеры с неестественно длинной длительностью (например односложное слово > 1.5с)
   - Гэпы между словами, где silence-map не маркирует весь гэп как тишину (остаток = бормотание/вздох/оговорка)
4. **Подозрительные sub-slices изолированно отправить ещё раз в Scribe** (`/v1/speech-to-text` с `-ss/-to` экстракцией). Это вскрывает скрытые двойные попытки.

### Cut-padding по типу

| Тип cut'a | Tail (после слова) | Lead (перед словом) |
|---|---|---|
| Mid-sentence (запятая) | 100мс | 80мс |
| Sentence-boundary (точка) | 200мс | 130-150мс |
| Начало видео | — | 130-150мс |
| **Конец видео** | **600-700мс** (после **настоящего** word-end через re-Scribe) | — |

**Тип cut'a определять:** последнее слово заканчивается на `,` и конструкция продолжается → mid. На `.` `?` `!` → boundary. Последний range в EDL → конец видео tail.

**Конец видео критичен:** Видео должно заканчиваться последним словом + **600-700мс воздуха** (даёт слову дозвучать, не создавая ощущение что запись продолжается).

**Two-step обязательная верификация последнего слова:**
1. Full-context Scribe часто маркирует последнее слово на 1-2 секунды позже (засчитывает выдох-decay как word-tail). Поэтому: перед финальным рендером последнее слово изолированно через sub-slice (например `ffmpeg -ss <full_context_word.start - 1> -to <full_context_word.end + 1>` + curl на Scribe) транскрибировать заново.
2. Брать **настоящий** word-end из slice-транскрипции, НЕ из full-context.
3. Range-end = настоящий word-end + **600-700мс**.

Пример: full-context `'schneiden.' 65.06-66.92` (1.86s, неверно). Re-Scribe slice 64-68: `'schneiden.' 65.04-65.42` (0.38s, верно). Range-end = 65.42 + 0.63 = **66.05**.

### EDL-конвенция

Каждая `edl.json` содержит блок `_padding_params`. Никаких произвольных magic numbers — padding всегда задокументирован и подстраиваемый:

```json
{
  "sources": { "name": "..." },
  "grade": null,
  "_padding_params": {
    "mid_sentence_tail_ms": 100,
    "mid_sentence_lead_ms": 80,
    "sentence_boundary_tail_ms": 200,
    "sentence_boundary_lead_ms": 140,
    "video_end_tail_ms": 630
  },
  "ranges": [...]
}
```

### План-согласование

Перед каждым cut'ом: cut-plan **на русском** (plain language) с findings по оговоркам и выбранным padding-ом на каждый range. Только после OK пользователя — рендер. При правках: те же инструменты, тот же workflow — никаких догадок.

### Workflow-branch после cut'a (обязательный checkpoint)

**Два пути имеют разные render-engines — они НЕ сходятся на Hyperframes.**

| | Direct-Hyperframes | Claude-Design-Bundle |
|---|---|---|
| Источник HTML | Claude собирает композиции локально в репо | claude.ai экспортирует bundle |
| Composition-contract | `@hyperframes/core` (`data-composition-id`, `window.__timelines`) | свой React+Babel+Stage стек |
| Preview | `npx hyperframes preview` (Studio на `localhost:3002`) | свой tiny dev-server (например `localhost:3030`) |
| Render | `npx hyperframes render` | своя Puppeteer + ffmpeg пайплайн (см. секцию *"Claude-Design HTML положить на cut-видео и рендерить"*) |
| Brand-система | `brand-guidelines/<name>/` из репо | Skill, загруженный в claude.ai/design |

**Что объединяет оба пути:** только бинарь `chrome-headless-shell`, который Hyperframes'овский `puppeteer-core` зависимости кладёт в `~/.cache/hyperframes/chrome/...` при `npx hyperframes doctor` прогоне. Bundle-pipeline вызывает этот бинарь напрямую — не `hyperframes`-CLI.

**Anti-pattern:** рефлекс *"Hyperframes же установлен, значит беру `npx hyperframes render`"* не работает с Claude-Design-bundle — StaticGuard отвергает (`[StaticGuard] Invalid HyperFrame contract`). См. предупреждения в секции 7 ниже.

**Важно про brand:** `brand-guidelines/` система в этом репо — **только** для direct-Hyperframes пути. Claude Design (claude.ai) имеет встроенную свою brand-систему — `brand-guidelines/default/SKILL.md` определяет design-skill (стандартное имя: `default-design`, переименовать на свою brand), который claude.ai загружает напрямую из аплоадженной папки. На Claude-Design-пути Claude отдаёт **только** транскрипт — никаких brand-файлов, никакой brand-token summary.

Прежде чем какие-либо HTML будут собираться/интегрироваться, Claude через `AskUserQuestion` спрашивает:

**Вопрос 1 (всегда): источник HTML**
- **Claude Design (claude.ai)** — Claude экспортирует только output-timeline транскрипт. Пользователь собирает HTML в claude.ai (brand там подгружается из skill) и приносит обратно. Claude **активно ждёт** и переспрашивает.
- **Direct Hyperframes** — Claude собирает storyboard и HTML-композиции сам, ему для этого нужна brand.

**Вопрос 2 (ТОЛЬКО при Direct Hyperframes): Brand Guidelines**
- `brand-guidelines/default/` (fallback)
- `brand-guidelines/<name>/` (например своя sub-brand под клиента / канал)
- без brand (тест-режим)

При Claude Design вопрос про brand **пропустить** — brand там приходит из загруженного skill, не из этого репо.

**При "Claude Design"** дополнительные обязанности:
1. **Экспортировать транскрипт — и БОЛЬШЕ НИЧЕГО не писать в чат.** Файлы: `projects/<name>/output_transcript.md` (sentence + word level с output-timestamps) и те же данные как `output_transcript.json`. Никакой секции "следующие шаги". Никаких подсказок по claude.ai-настройкам. Никаких brand-замечаний. Никаких рекомендаций. Обоснование: транскрипт пользователь загружает напрямую в claude.ai — всё остальное это шум.
2. **Активно ждать bundle:** сообщение заканчивается транскриптом. В последующих turn'ах проактивно переспрашивать, если пользователь говорит о чём-то другом, не передавая bundle. **Никогда не ждать молча** — иначе workflow блокируется.
3. Как только bundle придёт: применить bundle-pipeline (см. следующую секцию), затем frame-by-frame рендер.

---

## Claude-Design HTML положить на cut-видео и рендерить

Пользователь кидает HTML из claude.ai в проект, говорит "наложи на видео, синкни тайминги". Render-pipeline под проект ты собираешь сам. Следующие **обязательные замечания** экономят часы итераций — без них каждый новый bundle-render упирается в те же стены:

### 1. Распаковка bundle

Single HTML содержит `<script type="__bundler/manifest">` с JSON-манифестом. Per-entry может быть `compressed: true` (gzip) или `false` (raw base64) — оба варианта обрабатывать.

Файлы распаковать в `projects/<name>/_bundle_assets/<uuid>.<ext>` (JS, JSX, fonts, images). Роль UUID считывается из HTML-комментариев bundle-шаблона (`<!-- Main app -->`, `<!-- Animation engine -->`, `<!-- Components -->`, `<!-- Transcript data -->`).

**Robust filename:** HTML-filename может содержать пробелы ("Intro Animation.html"). Не хардкодить — autodetect единственный `*.html` в корне проекта, который содержит `__bundler/manifest`.

### 2. Format-check ПЕРЕД любой попыткой patch'а — есть два варианта bundle

| | **Format A — Hyperframes-runtime** | **Format B — React+Babel+Stage** |
|---|---|---|
| Размер | ~400 KB | ~1.5 MB |
| Mount-target | `#main` | `#root` |
| Player-API | `window.__player` с `enableRenderMode()` / `renderSeek(t)` напрямую доступен | Stage имеет `useTime()` — нужно патчить |
| Patches нужны | **НЕТ** — приходит со своим render-mode, использовать напрямую | **ДА** — 3 патча (см. пункт 3) |

**Detection после extract:** если в `_bundle_assets/*.jsx` есть файлы → **Format B**. Если в extracted JS есть `var HyperShader = ...` → **Format A**.

**Почему критично:** Format-B patches приложенные к Format-A коду = ничего не происходит, debugging в кругах.

### 3. Render-mode patches (ТОЛЬКО Format B)

Три места патчить, чтобы bundle можно было детерминированно рулить frame-by-frame:

**App component** — проверить `window.__renderMode = true` → скрыть Stage UI / TweaksPanel через `{!renderMode && <TweaksPanel>...}`.

⚠️ **`?render=1` — это ловушка.** Звучит логично, но не работает: bootstrap claude.ai реагирует на ЛЮБОЙ query-string и берёт альтернативный React/Babel mount-path, где `__player` никогда не доступен.

**Правильно:** Render-mode globals задавать **до** page-load через `evaluateOnNewDocument` Puppeteer'a, **без** query-string:
```js
await page.evaluateOnNewDocument(() => {
  window.__renderMode = true;
  window.__hfVideoUrl = "/assets/speaker.mp4";
});
await page.goto("http://localhost:3034/");  // БЕЗ ?render=1
```

**Stage component (animation engine)** — в render mode: никакого rAF-loop'а, экспонировать `window.__setStageTime(t)` (renderer вызывает его на каждый frame), рендерить минимальный layout (full-frame canvas, без bar, без auto-scale).

**Video components (SpeakerPlaceholder и т.п.)** — в render mode: НИКОГДА не вызывать `video.play()` / `video.pause()`, только точно ставить `video.currentTime = t`. Иначе race condition с frame-capture.

### 4. Speaker-video All-Intra-keyframes конвертация (ОБЯЗАТЕЛЬНО перед рендером)

**Это ТОТ САМЫЙ "видео висит" баг.** Frame-by-frame `video.currentTime = t` снапит к следующему keyframe в H.264 с B-frames. Стандартный encoding имеет keyframes раз в ~4с, то есть frame на t=5с показывает позу с t=4с. Speaker выглядит замороженным.

**Обязательная конвертация перед рендером:**
```bash
ffmpeg -i clips/edited.mp4 \
  -c:v libx264 -preset fast -crf 18 \
  -g 1 -keyint_min 1 -sc_threshold 0 \
  -pix_fmt yuv420p -r 30 \
  -c:a aac -b:a 192k \
  assets/speaker.mp4
```
`-g 1` = каждый frame это keyframe. Файл становится в ~5× больше (62 MB → 308 MB), но seeks точные.

**Конвенция:** bundle ожидает speaker-видео в `projects/<name>/assets/speaker.mp4`. Это единственный путь — не `clips/edited.mp4`, не `renders/final-4k.mp4`.

### 5. Word-sync против `transcripts/master.json` (главный driver итераций)

claude.ai часто промахивается по anchor-словам на 0.3-1с. Это в основном единственная причина, по которой bundle-assets вообще приходится править.

**Подход:** найти триггеры анимации в bundle (типично: `transcript`-JSON-asset или inline-таблица в Main-App), сверить с ElevenLabs word-timestamps из `master.json`, поправить в HTML/assets где не сходится. И только потом рендерить.

### 6. Frame-by-frame рендер с chrome-headless-shell + Puppeteer + ffmpeg

**По умолчанию:** 4K @ 60fps через viewport `1920×1080 @ deviceScaleFactor: 2` → CSS/SVG/text острый при 2× DPR, speaker-видео билинейно апскейлится.

**Override:** env-переменная `RENDER_QUALITY=1080p` → 1920×1080 @ DPR 1, ~4 мин вместо 8-10.

**Duration:** через `ffprobe assets/speaker.mp4` считать — никогда не хардкодить.

**Wait-strategy:** `waitUntil: "load"` (НЕ `networkidle0` — streaming speaker-видео держит network-idle event бесконечно, renderer ждёт до timeout). После load — poll'ить `window.__renderReady === true` перед стартом frame-capture.

**Audio:** muxить из `assets/speaker.mp4`.

**chrome-headless-shell** лежит в `~/.cache/hyperframes/chrome/...` после `npx hyperframes doctor` — тот же бинарь, что Hyperframes использует внутри.

**Output:**
- 4K: `projects/<name>/renders/final-4k.mp4`
- 1080p: `projects/<name>/renders/final.mp4`

### 7. Workflow итераций

**Bundle 1:1 принят от пользователя (asset-edit не нужен)** → сразу 1080p рендер → собрать фидбек → при OK — 4K. **Никакого обязательного preview-server'а.**

**Asset-edits нужны (word-sync, brand-tweaks)** → собственный tiny dev-server на `localhost:3030` с hot-reload (mtime polling, injected reload-script, range-requests для видео). Bundle имеет встроенный Stage UI с playback-bar для скраббинга. Edit → repack → browser автоматически обновляется. Только после OK пользователя — финальный рендер.

⚠️ **НЕ `npx hyperframes preview` для Claude-Design bundles** — Studio строго enforce'ит Hyperframes composition contract (`data-composition-id`, `window.__timelines`). У bundles этого нет, Studio reject'ит с `[StaticGuard] Invalid HyperFrame contract`.

⚠️ **НЕ `npx hyperframes render` напрямую на bundle** — та же причина reject'а.

⚠️ **НЕ `page.screencast()`** real-time recording — лагает, дропает frames, out-of-sync.

⚠️ **Рендер без keyframe-конвертации** = speaker висит. См. пункт 4.

---

## Конкретные команды (copy-pasteable)

**1. Pack transcripts (phrase-группировка):**

```bash
uv run --project ./video-use python ./video-use/helpers/pack_transcripts.py \
  --edit-dir "projects/<projektname>" --silence-threshold 0.4
```

На **Windows** перед этим обязательно установить `PYTHONUTF8=1`, иначе `UnicodeEncodeError` при записи `≥`-символа:

```powershell
$env:PYTHONUTF8 = "1"; uv run --project ./video-use python `
  ./video-use/helpers/pack_transcripts.py --edit-dir "projects/<projektname>" `
  --silence-threshold 0.4
```

**2. Silence-map на source:**

```bash
ffmpeg -hide_banner -nostats -i raw/<projekt>/<file>.mp4 \
  -af "silencedetect=noise=-30dB:duration=0.25" -f null - 2>&1 | grep "silence_"
```

**3. Sub-slice для verifikation оговорок или re-Scribe последнего слова:**

Извлечь audio:
```bash
ffmpeg -y -hide_banner -nostats -i raw/<projekt>/<file>.mp4 \
  -ss <start_sec> -to <end_sec> -vn -ac 1 -ar 16000 -c:a pcm_s16le \
  /tmp/_slice.wav
```

Отправить в Scribe (curl):
```bash
KEY=$(grep '^ELEVENLABS_API_KEY=' .env | cut -d= -f2)
curl -sS -X POST "https://api.elevenlabs.io/v1/speech-to-text" \
  -H "xi-api-key: $KEY" \
  -F "file=@/tmp/_slice.wav;type=audio/wav" \
  -F "model_id=scribe_v1" \
  -F "language_code=ru" \
  -F "timestamps_granularity=word" \
  -F "diarize=false"
```

Возвращённые slice word-times относительны к slice-start — прибавить `<start_sec>` чтобы получить original timeline.

> Примечание для русской версии: `language_code=ru` вместо `de` в оригинале.

**4. Cut-render (video-use):**

```bash
uv run --project ./video-use python ./video-use/helpers/render.py \
  projects/<projekt>/edl.json -o projects/<projekt>/clips/edited.mp4
```

**5. Speaker-video keyframe-конвертация (ОБЯЗАТЕЛЬНО перед bundle-render):**

```bash
ffmpeg -i projects/<projekt>/clips/edited.mp4 \
  -c:v libx264 -preset fast -crf 18 \
  -g 1 -keyint_min 1 -sc_threshold 0 \
  -pix_fmt yuv420p -r 30 \
  -c:a aac -b:a 192k \
  projects/<projekt>/assets/speaker.mp4
```

### Windows-замечания

- `PYTHONUTF8=1` ставить перед каждым `uv run python ./video-use/helpers/...` — иначе encoding-crashes на unicode-символах.
- `grade: "auto"` в EDL на Windows сейчас сломан (ffmpeg filter-parser конфликтует с `C:\`-путями в аргументе `metadata=print:file=...`). **Workaround:** `grade: null` — работает, source-картинка обычно достаточно чистая.
- ffprobe / silencedetect output идёт в stderr; в PowerShell фильтровать через `2>&1 | Select-String "silence_"`.
- `Start-Process projects\...\clips\edited.mp4` открывает видео в default-плеере для review.

---

## Референсы

- Hyperframes Docs: https://hyperframes.heygen.com/quickstart
- Hyperframes Catalog (50+ блоков): https://hyperframes.heygen.com/catalog/blocks/data-chart
- Video-Use SKILL.md: https://github.com/browser-use/video-use/blob/main/SKILL.md
- Hyperframes Student-Kit (12 готовых примеров): https://github.com/nateherkai/hyperframes-student-kit

---

## Что в итоге должно быть верно

1. `npx hyperframes doctor` запускается зелёным (кроме Docker — не важно).
2. `.claude/skills/` содержит 4 junctions/symlinks: `hyperframes`, `gsap`, `hyperframes-cli`, `video-use`.
3. `./video-use/` клонирован и имеет работающий `.venv` (проверка через `uv run --project ./video-use python -c "import video_use"`).
4. `./.env` и `./video-use/.env` содержат оба ElevenLabs key (либо оба пусты с чётким напоминанием).
5. `package.json` содержит `puppeteer-core` (иначе bundle-render крашится).
6. Пользователь может положить сырой MP4 в `raw/` и workflow стартует при *"Edit @raw/..."*.
