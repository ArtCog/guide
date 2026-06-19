# 🤖 SETUP-GLM — установщик GLM 5.2 в Claude Code (отдай этот файл своему агенту)

> **Как пользоваться (для человека):** скинь этот файл своему ИИ-агенту — **Claude Code, Codex
> или Antigravity** — и напиши: **«Выполни этот файл по шагам»**. Агент задаст тебе пару вопросов
> и сам всё настроит, объясняя каждый шаг. Key/ключи будут спрашиваться у тебя — в файле их нет.
>
> (Не хочешь агента? Рядом лежит `setup-glm.ps1` — двойной клик/запуск в PowerShell сделает то же.)

---

## 🧠 ИНСТРУКЦИЯ ДЛЯ АГЕНТА — выполняй строго по шагам

Ты — установщик. Твоя задача: настроить GLM 5.2 в Claude Code на машине пользователя, создав
структуру папок «модель = папка». **Определи ОС пользователя** (Windows / macOS / Linux) и используй
её команды и пути. **На каждом шаге кратко объясняй пользователю простыми словами, ЧТО и ЗАЧЕМ ты делаешь.**
Где нужен ключ — **попроси пользователя вставить его**, не выдумывай.

### ШАГ 1. Задай вопросы (ПО ОДНОМУ, дождись ответа на каждый — НЕ продолжай без ответа)

**Вопрос 1 — провайдер.** Спроси:
> «Через какого провайдера подключаем GLM 5.2?
> **A) OpenRouter** — один ключ, без подписки, платишь по токенам, гибко.
> **B) z.ai** — официальный провайдер модели, есть подписки-планы, дешевле при ежедневной работе.»

**Вопрос 2 — плагин (ЗАДАВАЙ ТОЛЬКО ЕСЛИ выбран OpenRouter).** Спроси:
> «Хочешь пользоваться через нативный плагин Claude Code в VS Code (графический интерфейс),
> а не только через терминал?
> Если да — поставлю локальный прокси (нужно, потому что плагин напрямую с OpenRouter падает с
> ошибкой `redacted_thinking`). Если нет — оставим простой терминал-режим.»
> *(Если выбран z.ai — НЕ задавай этот вопрос: там плагин работает нативно, прокси не нужен.)*

**Вопрос 3 — папка Opus.** Спроси:
> «Сделать рядом вторую папку для Claude (Opus/Sonnet), чтобы в одном окне VS Code сравнивать GLM и
> Claude? Это требует активной подписки **Claude Pro или Max** и входа `claude /login`.
> Да / Нет.»

Запомни ответы: `PROVIDER` (openrouter|zai), `PLUGIN` (yes|no, только для openrouter), `OPUS_FOLDER` (yes|no).

### ШАГ 2. Создай структуру папок

Спроси у пользователя имя/расположение корневой папки (по умолчанию предложи `GLM-Claude-Code`
в текущей директории). Создай:
Структура ЗАВИСИТ от ответа OPUS_FOLDER:

**Если OPUS_FOLDER = НЕТ (только GLM):** конфиг кладётся ПРЯМО в корневую папку →
`<КОРЕНЬ>/.claude/settings.local.json`. Пользователь открывает эту папку — и сразу работает GLM,
без вложенных папок и без `cd`. (Вложенная `glm/` тут не нужна — она для случая с Opus.)

**Если OPUS_FOLDER = ДА (GLM и Opus рядом):** создай две подпапки (в самом КОРНЕ `.claude` НЕ создавай):
```
<КОРЕНЬ>/
├── glm/    ← .claude/settings.local.json с настройкой GLM
└── opus/   ← пустая, БЕЗ .claude → обычный Claude по подписке
```

Объясни пользователю: «Claude Code берёт настройки из той папки, где запущен. Одна модель → конфиг
прямо в папке проекта (открыл и работаешь). Две модели → у каждой своя подпапка, и в одном окне
VS Code два терминала = две модели рядом.»

### ШАГ 3. Положи конфиг в `settings.local.json` целевой папки — по выбранной ветке

Целевая папка: только GLM → `<КОРЕНЬ>/.claude/`; с Opus → `<КОРЕНЬ>/glm/.claude/`.
Создай в ней `.claude/settings.local.json`. Выбери ОДИН вариант:

**ВЕТКА A — OpenRouter без плагина (PROVIDER=openrouter, PLUGIN=no):**
Попроси ключ OpenRouter (`sk-or-...`, берётся на openrouter.ai/keys) и вставь его в `ANTHROPIC_AUTH_TOKEN`:
```json
{
  "permissions": { "allow": [], "deny": [], "ask": [] },
  "env": {
    "ANTHROPIC_BASE_URL": "https://openrouter.ai/api",
    "ANTHROPIC_AUTH_TOKEN": "<КЛЮЧ-OPENROUTER>",
    "ANTHROPIC_API_KEY": "",
    "API_TIMEOUT_MS": "3000000",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "z-ai/glm-5.2",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "z-ai/glm-5.2",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "z-ai/glm-5.2",
    "ANTHROPIC_SMALL_FAST_MODEL": "z-ai/glm-5.2",
    "CLAUDE_CODE_SUBAGENT_MODEL": "z-ai/glm-5.2"
  }
}
```
Предупреди: эта ветка работает в ТЕРМИНАЛЕ; в нативном плагине будет ошибка `redacted_thinking`.

**ВЕТКА B — OpenRouter + плагин через прокси (PROVIDER=openrouter, PLUGIN=yes):**
1. Проверь Node.js: `node -v` (нужен ≥18; нет → подскажи поставить с nodejs.org).
2. Поставь прокси: `npm install -g @musistudio/claude-code-router`. Проверь: `ccr -v`.
3. Попроси ключ OpenRouter. Придумай локальный пароль (например, сгенерируй случайную строку) — назови его `ROUTER_PASS`.
4. Создай файл `~/.claude-code-router/config.json` (Windows: `%USERPROFILE%\.claude-code-router\config.json`):
```json
{
  "HOST": "127.0.0.1",
  "PORT": 3456,
  "APIKEY": "<ROUTER_PASS>",
  "LOG": true,
  "Providers": [
    {
      "name": "openrouter",
      "api_base_url": "https://openrouter.ai/api/v1/chat/completions",
      "api_key": "<КЛЮЧ-OPENROUTER>",
      "models": ["z-ai/glm-5.2"],
      "transformer": { "use": ["openrouter"] }
    }
  ],
  "Router": {
    "default": "openrouter,z-ai/glm-5.2",
    "background": "openrouter,z-ai/glm-5.2",
    "think": "openrouter,z-ai/glm-5.2",
    "longContext": "openrouter,z-ai/glm-5.2",
    "longContextThreshold": 60000,
    "webSearch": "openrouter,z-ai/glm-5.2"
  }
}
```
5. Запусти прокси: `ccr restart` (или `ccr start`). Проверь: `ccr status` → должно быть Running.
6. Положи в `glm/.claude/settings.local.json` (ключ OpenRouter сюда НЕ пиши — он уже в роутере;
   в `ANTHROPIC_AUTH_TOKEN` идёт `ROUTER_PASS`):
```json
{
  "permissions": { "allow": [], "deny": [], "ask": [] },
  "env": {
    "ANTHROPIC_BASE_URL": "http://127.0.0.1:3456",
    "ANTHROPIC_AUTH_TOKEN": "<ROUTER_PASS>",
    "ANTHROPIC_API_KEY": "",
    "API_TIMEOUT_MS": "3000000",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "z-ai/glm-5.2",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "z-ai/glm-5.2",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "z-ai/glm-5.2",
    "ANTHROPIC_SMALL_FAST_MODEL": "z-ai/glm-5.2",
    "CLAUDE_CODE_SUBAGENT_MODEL": "z-ai/glm-5.2"
  }
}
```
Предупреди: прокси должен быть запущен, пока работаешь с плагином. После перезагрузки ПК — снова `ccr start`.

**ВЕТКА C — z.ai напрямую (PROVIDER=zai):**
Попроси ключ z.ai (z.ai/manage-apikey) и вставь в `ANTHROPIC_AUTH_TOKEN`:
```json
{
  "permissions": { "allow": [], "deny": [], "ask": [] },
  "env": {
    "ANTHROPIC_BASE_URL": "https://api.z.ai/api/anthropic",
    "ANTHROPIC_AUTH_TOKEN": "<КЛЮЧ-Z-AI>",
    "ANTHROPIC_API_KEY": "",
    "API_TIMEOUT_MS": "3000000",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "glm-5.2",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "glm-5.2",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "glm-5.2",
    "ANTHROPIC_SMALL_FAST_MODEL": "glm-5.2",
    "CLAUDE_CODE_SUBAGENT_MODEL": "glm-5.2"
  }
}
```
Работает и в терминале, и в плагине (z.ai официально поддерживает плагин).

> Запомни различие: на **OpenRouter** имя модели с префиксом `z-ai/glm-5.2`, у **z.ai** — голое `glm-5.2`.

### ШАГ 4. Папка Opus (только если OPUS_FOLDER=yes)
Папка `opus/` остаётся ПУСТОЙ (без `.claude`) — это нарочно: так в ней запустится обычный Claude по
подписке пользователя. Скажи пользователю: «В папке opus запусти `claude` и при первом старте выполни
`/login` под своим аккаунтом Claude Pro/Max».

### ШАГ 5. Объясни, как пользоваться (покажи команды)
Адаптируй пути под ОС; в Windows из-за пробелов нужны кавычки.

**Только GLM (без Opus):** конфиг лежит в корне — просто открой папку и запусти:
```
cd "<КОРЕНЬ>"
claude
```

**С папкой Opus:** два терминала (split) в одном окне VS Code:
```
# Терминал 1 → GLM:
cd "<КОРЕНЬ>/glm"
claude
# Терминал 2 → Claude/Opus (сначала /login под Pro/Max):
cd "<КОРЕНЬ>/opus"
claude
```
Одно окно, два терминала = две модели рядом.

### ШАГ 6. Проверка и помощь
Скажи пользователю запустить `claude` в целевой папке (корень или `glm/`) и спросить «привет, какая ты модель». Если отвечает без
ошибки — готово. Частые проблемы:
- `ccr: command not found` → перезапусти терминал (npm-bin не в PATH).
- Плагин всё ещё `redacted_thinking` → прокси не запущен (`ccr status`) или нужен Reload Window в VS Code.
- `401 unauthorized` → `APIKEY` в конфиге роутера и `ANTHROPIC_AUTH_TOKEN` в settings должны совпадать.
- В opus запускается не Claude → пользователь не сделал `/login` или нет подписки Pro/Max.

**В конце** покажи краткое резюме: какой провайдер, где какие папки, как стартовать GLM и Claude.
