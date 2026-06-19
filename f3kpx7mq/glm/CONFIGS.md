# GLM 5.2 в Claude Code — готовые конфиги (для ролика / аудитории)

Код кладётся в **`.claude/settings.local.json`** папки-проекта.
Зрителю — два основных кода: **КОД 1 — OpenRouter** и **КОД 2 — z.ai напрямую**.
Прокси — отдельный доп. шаг (внизу), только для тех, кому нужен именно нативный плагин на OpenRouter.

---

## 🅰️ КОД 1 — OpenRouter (дефолт, без прокси)

Один ключ → сотни моделей, без подписки (платишь по токенам).
Ключ: [openrouter.ai/keys](https://openrouter.ai/keys) (формат `sk-or-v1-...`).

```json
{
  "permissions": { "allow": [], "deny": [], "ask": [] },
  "env": {
    "ANTHROPIC_BASE_URL": "https://openrouter.ai/api",
    "ANTHROPIC_AUTH_TOKEN": "ВСТАВЬ-СВОЙ-OPENROUTER-КЛЮЧ",
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
- Модель — `z-ai/glm-5.2` (slug OpenRouter, с префиксом!).
- ✅ Терминал. ⚠️ Нативный плагин — НЕ работает (`redacted_thinking`), для плагина нужен прокси (см. низ).

---

## 🅱️ КОД 2 — z.ai напрямую (официальный провайдер)

Работает И в терминале, И в плагине из коробки (z.ai официально поддерживает плагин). Есть подписка-планы.
Ключ: [z.ai/manage-apikey](https://z.ai/manage-apikey). Планы: [z.ai/subscribe](https://z.ai/subscribe) ($16/$64/$144).

```json
{
  "permissions": { "allow": [], "deny": [], "ask": [] },
  "env": {
    "ANTHROPIC_BASE_URL": "https://api.z.ai/api/anthropic",
    "ANTHROPIC_AUTH_TOKEN": "ВСТАВЬ-СВОЙ-Z-AI-КЛЮЧ",
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
- Модель — голое **`glm-5.2`** (без префикса!).

---

## Какой выбрать
| | КОД 1 — OpenRouter | КОД 2 — z.ai |
|---|---|---|
| `BASE_URL` | `https://openrouter.ai/api` | `https://api.z.ai/api/anthropic` |
| `AUTH_TOKEN` | ключ `sk-or-...` | ключ z.ai |
| имя модели | `z-ai/glm-5.2` | `glm-5.2` |
| Подписка | ❌ только токены | ✅ планы $16/$64/$144 |
| Терминал | ✅ | ✅ |
| Нативный плагин | ⚠️ только через прокси (ниже) | ✅ из коробки |
| Кому | гибко, мультимодельно | кодишь каждый день / нужен плагин |

---

## ➕ ДОП. ШАГ — OpenRouter через прокси (только если нужен нативный плагин)

Нативное расширение Claude Code не дружит с OpenRouter напрямую (баг `redacted_thinking`,
[claude-code #37465](https://github.com/anthropics/claude-code/issues/37465)). Кому кровь из носа нужен
именно плагин на OpenRouter — ставит локальный прокси `claude-code-router`, и тогда вместо КОДА 1 идёт:

```json
{
  "permissions": { "allow": [], "deny": [], "ask": [] },
  "env": {
    "ANTHROPIC_BASE_URL": "http://127.0.0.1:3456",
    "ANTHROPIC_AUTH_TOKEN": "ПАРОЛЬ-ИЗ-КОНФИГА-РОУТЕРА",
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
- `BASE_URL` = локальный прокси, `AUTH_TOKEN` = пароль роутера (ключ OpenRouter уходит в конфиг роутера).
- Полная пошаговая настройка: **[PROXY-SETUP-instruction.md](./PROXY-SETUP-instruction.md)**.
- Альтернатива тем, кто не хочет прокси, но хочет плагин → просто КОД 2 (z.ai).

> Запуск в терминале (пробел в пути → ОБЯЗАТЕЛЬНО кавычки):
> `cd "C:\GLM 5.2 TEST\GLM 5.2"` затем `claude`
