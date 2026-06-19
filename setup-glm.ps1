# setup-glm.ps1 — автонастройка GLM 5.2 в Claude Code (Windows / PowerShell)
#
# СПОСОБ 1 (просто): выдели ВЕСЬ файл -> Copy -> вставь в окно PowerShell -> Enter.
# СПОСОБ 2 (надёжно): powershell -ExecutionPolicy Bypass -File .\setup-glm.ps1
#
# Весь код обёрнут в & { ... } — поэтому вставка целиком работает: PowerShell
# дождётся закрывающей } и выполнит всё разом (а не по строчке).

& {
$ErrorActionPreference = "Stop"
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch {}  # чтобы кириллица не превращалась в кракозябры

function Write-Step($t) { Write-Host "`n=== $t ===" -ForegroundColor Cyan }
function Write-JsonFile($path, $obj) {
  $dir = Split-Path -Parent $path
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
  $json = $obj | ConvertTo-Json -Depth 6
  [System.IO.File]::WriteAllText($path, $json, (New-Object System.Text.UTF8Encoding($false)))
  Write-Host "  создан: $path" -ForegroundColor Green
}
function Write-Text($path, $content) {
  $dir = Split-Path -Parent $path
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
  [System.IO.File]::WriteAllText($path, $content, (New-Object System.Text.UTF8Encoding($false)))
  Write-Host "  создан: $path" -ForegroundColor Green
}
function New-SettingsJson($baseUrl, $token, $model) {
  return @"
{
  "permissions": { "allow": [], "deny": [], "ask": [] },
  "env": {
    "ANTHROPIC_BASE_URL": "$baseUrl",
    "ANTHROPIC_AUTH_TOKEN": "$token",
    "ANTHROPIC_API_KEY": "",
    "API_TIMEOUT_MS": "3000000",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "$model",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "$model",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "$model",
    "ANTHROPIC_SMALL_FAST_MODEL": "$model",
    "CLAUDE_CODE_SUBAGENT_MODEL": "$model"
  }
}
"@
}

Write-Host "GLM 5.2 -> Claude Code: установщик" -ForegroundColor Yellow

# --- ВОПРОС 1: провайдер ---
Write-Step "Вопрос 1 — провайдер"
Write-Host "A) OpenRouter — один ключ, без подписки, по токенам."
Write-Host "B) z.ai — официальный провайдер, есть подписки-планы."
do { $p = (Read-Host "Выбери A или B").Trim().ToUpper() } while ($p -ne "A" -and $p -ne "B")
$provider = if ($p -eq "A") { "openrouter" } else { "zai" }

# --- ВОПРОС 2: плагин (только OpenRouter) ---
$plugin = "no"
if ($provider -eq "openrouter") {
  Write-Step "Вопрос 2 — нативный плагин VS Code?"
  Write-Host "OpenRouter напрямую плагин не тянет (ошибка redacted_thinking)."
  Write-Host "Да -> поставлю локальный прокси. Нет -> только терминал."
  $a = (Read-Host "Нужен плагин? (y/n)").Trim().ToLower()
  if ($a -eq "y" -or $a -eq "yes" -or $a -eq "д") { $plugin = "yes" }
}

# --- ВОПРОС 3: папка Opus ---
Write-Step "Вопрос 3 — папка Opus для сравнения?"
Write-Host "Вторая папка для обычного Claude (Opus/Sonnet). Нужна подписка Claude Pro или Max + /login."
$a = (Read-Host "Создать папку opus? (y/n)").Trim().ToLower()
$opusFolder = ($a -eq "y" -or $a -eq "yes" -or $a -eq "д")

# --- Корневая папка ---
Write-Step "Папка проекта"
$rootName = Read-Host "Имя папки (Enter = GLM-Claude-Code)"
if ([string]::IsNullOrWhiteSpace($rootName)) { $rootName = "GLM-Claude-Code" }
$root = Join-Path (Get-Location) $rootName
$glm  = Join-Path $root "glm"
New-Item -ItemType Directory -Force -Path $glm | Out-Null
Write-Host "  создана: $glm" -ForegroundColor Green
$opus = $null
if ($opusFolder) {
  $opus = Join-Path $root "opus"
  New-Item -ItemType Directory -Force -Path $opus | Out-Null
  Write-Host "  создана: $opus (пустая — обычный Claude по подписке)" -ForegroundColor Green
}
Write-Host "  ВАЖНО: в корне НЕТ .claude — модель привязана к папке (glm/ = GLM, opus/ = твой Claude)."

# --- Конфиг по выбранной ветке ---
$settingsPath = Join-Path $glm ".claude\settings.local.json"

if ($provider -eq "zai") {
  Write-Step "Ветка C — z.ai напрямую"
  $key = Read-Host "Вставь свой ключ z.ai (z.ai/manage-apikey)"
  Write-Text $settingsPath (New-SettingsJson "https://api.z.ai/api/anthropic" $key "glm-5.2")
} elseif ($plugin -eq "no") {
  Write-Step "Ветка A — OpenRouter (терминал)"
  $key = Read-Host "Вставь свой ключ OpenRouter (sk-or-..., openrouter.ai/keys)"
  Write-Text $settingsPath (New-SettingsJson "https://openrouter.ai/api" $key "z-ai/glm-5.2")
  Write-Host "  Примечание: эта ветка для ТЕРМИНАЛА; в плагине будет redacted_thinking." -ForegroundColor DarkYellow
} else {
  Write-Step "Ветка B — OpenRouter + прокси (плагин)"
  $nodeOk = $true
  try { node -v | Out-Null } catch { $nodeOk = $false }
  if (-not $nodeOk) { Write-Host "Нужен Node.js (nodejs.org). Прервано." -ForegroundColor Red; return }
  $key = Read-Host "Вставь свой ключ OpenRouter (sk-or-...)"
  $routerPass = "ccr-" + ([guid]::NewGuid().ToString('N').Substring(0,12))

  Write-Host "  Ставлю claude-code-router (npm -g)..."
  npm install -g "@musistudio/claude-code-router" | Out-Null

  $routerCfg = [ordered]@{
    HOST = "127.0.0.1"; PORT = 3456; APIKEY = $routerPass; LOG = $true
    Providers = @([ordered]@{
      name = "openrouter"
      api_base_url = "https://openrouter.ai/api/v1/chat/completions"
      api_key = $key
      models = @("z-ai/glm-5.2")
      transformer = [ordered]@{ use = @("openrouter") }
    })
    Router = [ordered]@{
      default = "openrouter,z-ai/glm-5.2"; background = "openrouter,z-ai/glm-5.2"
      think = "openrouter,z-ai/glm-5.2"; longContext = "openrouter,z-ai/glm-5.2"
      longContextThreshold = 60000; webSearch = "openrouter,z-ai/glm-5.2"
    }
  }
  Write-JsonFile (Join-Path $env:USERPROFILE ".claude-code-router\config.json") $routerCfg

  Write-Host "  Запускаю прокси..."
  try { ccr restart | Out-Null } catch { Write-Host "  Не смог вызвать ccr — перезапусти терминал и сделай 'ccr start'." -ForegroundColor DarkYellow }

  Write-Text $settingsPath (New-SettingsJson "http://127.0.0.1:3456" $routerPass "z-ai/glm-5.2")
  Write-Host "  Прокси должен быть запущен при работе с плагином. После перезагрузки ПК: ccr start" -ForegroundColor DarkYellow
}

# --- Итог ---
Write-Step "Готово"
Write-Host "Запуск GLM:" -ForegroundColor Green
Write-Host "  cd `"$glm`""
Write-Host "  claude"
if ($opusFolder) {
  Write-Host "Запуск Claude/Opus (сначала /login под Pro/Max):" -ForegroundColor Green
  Write-Host "  cd `"$opus`""
  Write-Host "  claude"
}
Write-Host "`nДва терминала в одном окне VS Code = две модели рядом." -ForegroundColor Yellow
}
