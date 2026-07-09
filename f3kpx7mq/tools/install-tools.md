# Установщик: claude-video (/watch) + ponytail

Отдай этот файл своему Claude Code: «выполни install-tools.md» — он проверит зависимости
и скажет, какие две команды ввести. Или просто следуй шагам сам, это 2 минуты.

## Шаг 0. Зависимости (нужны только для claude-video)

Агент, проверь и доустанови недостающее:

```bash
ffmpeg -version   # нет? → winget install Gyan.FFmpeg   | brew install ffmpeg
yt-dlp --version  # нет? → winget install yt-dlp.yt-dlp | brew install yt-dlp
```

## Шаг 1. claude-video — агент смотрит видео

Команды `/plugin` пользователь вводит сам в сессии Claude Code
(агент не может выполнить их за тебя — попроси его напомнить их тебе в конце):

```
/plugin marketplace add bradautomates/claude-video
/plugin install watch@claude-video
```

Использование: `/watch <url или путь> <вопрос>`
Например: `/watch https://youtu.be/... о чём это видео?`

Опционально (для видео без субтитров): ключ Groq или OpenAI в `~/.config/watch/.env`:

```
GROQ_API_KEY=...
```

## Шаг 2. ponytail — меньше кода, меньше токенов

```
/plugin marketplace add DietrichGebert/ponytail
/plugin install ponytail@ponytail
```

Использование: работает сам; интенсивность — `/ponytail lite|full|ultra|off`,
ревизия диффа на overengineering — `/ponytail-review`.

## Проверка

- `/watch` на любом YouTube-ролике с субтитрами → пересказ без ключей.
- `/ponytail-audit` в любом репо → отчёт, где код можно ужать.

Источники: github.com/bradautomates/claude-video · github.com/DietrichGebert/ponytail
