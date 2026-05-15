# Script de Lanzamiento: DeepSeek via OpenCode (FIXED)
# Corrige el error de "Not Found" ajustando la URL base

$envFile = ".env"
if (Test-Path $envFile) {
    $apiKeyLine = Get-Content $envFile | Select-String "DEEPSEEK_API_KEY="
    if ($apiKeyLine) {
        $apiKey = $apiKeyLine.ToString().Split('=')[1].Trim()
    } else {
        Write-Error "No se encontró la llave"
        exit
    }
}

# CAMBIO CRÍTICO: Quitamos el /v1 porque OpenCode lo suele añadir solo
$env:OPENAI_API_KEY = $apiKey
$env:OPENAI_BASE_URL = "https://api.deepseek.com" 

Write-Host "----------------------------------------------------" -ForegroundColor Cyan
Write-Host "  OpenCode Agent Mode (Re-Configurado)" -ForegroundColor Green
Write-Host "  Endpoint: https://api.deepseek.com" -ForegroundColor Gray
Write-Host "----------------------------------------------------" -ForegroundColor Cyan

# Intentamos con el modelo chat primero para asegurar conectividad
opencode --model openai/deepseek-chat
