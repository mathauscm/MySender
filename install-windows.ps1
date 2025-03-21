# Script completo para instalar Node.js, Git, Redis e MySender no Windows
# Função para imprimir mensagens coloridas
function Write-ColoredMessage {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

# Verificar se o script está sendo executado como administrador
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-ColoredMessage "Este script precisa ser executado como administrador. Por favor, reinicie o PowerShell como administrador." Red
    exit
}

# Criar diretório temporário para downloads
$tempDir = "$env:TEMP\installer_temp"
New-Item -Path $tempDir -ItemType Directory -Force | Out-Null

# Instalar Chocolatey (gerenciador de pacotes para Windows)
Write-ColoredMessage "Verificando se o Chocolatey está instalado..." Yellow
if (-not (Get-Command choco -ErrorAction SilentlyContinue)) {
    Write-ColoredMessage "Instalando Chocolatey..." Yellow
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://chocolatey.org/install.ps1'))
    # Recarregar PATH para reconhecer o comando choco
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
} else {
    Write-ColoredMessage "Chocolatey já está instalado." Green
}

# Função para instalar um pacote via Chocolatey
function Install-ChocolateyPackage {
    param(
        [string]$PackageName,
        [string]$DisplayName
    )
    
    Write-ColoredMessage "Verificando se $DisplayName está instalado..." Yellow
    
    # Verificar se o pacote já está instalado
    $installed = choco list --local-only | Where-Object { $_ -match "^$PackageName\s" }
    
    if (-not $installed) {
        Write-ColoredMessage "Instalando $DisplayName..." Yellow
        choco install $PackageName -y
        if ($LASTEXITCODE -ne 0) {
            Write-ColoredMessage "Erro ao instalar $DisplayName. Código de saída: $LASTEXITCODE" Red
            return $false
        }
        Write-ColoredMessage "$DisplayName instalado com sucesso!" Green
        return $true
    } else {
        Write-ColoredMessage "$DisplayName já está instalado." Green
        return $true
    }
}

# Instalar Node.js versão específica (v18.20.5)
Write-ColoredMessage "Verificando se Node.js está instalado..." Yellow
$nodeInstalled = $false
$currentNode = Get-Command node -ErrorAction SilentlyContinue
$targetNodeVersion = "v18.20.5"

if ($currentNode) {
    $currentVersion = (node --version)
    if ($currentVersion -eq $targetNodeVersion) {
        Write-ColoredMessage "Node.js $targetNodeVersion já está instalado." Green
        $nodeInstalled = $true
    } else {
        Write-ColoredMessage "Node.js $currentVersion está instalado, mas precisamos da versão $targetNodeVersion." Yellow
        Write-ColoredMessage "Removendo a versão atual do Node.js..." Yellow
        choco uninstall nodejs nodejs-lts -y
    }
}

if (-not $nodeInstalled) {
    Write-ColoredMessage "Instalando Node.js $targetNodeVersion..." Yellow
    # Usando NVM Windows para instalar versão específica do Node.js
    Install-ChocolateyPackage -PackageName "nvm" -DisplayName "NVM for Windows"
    # Recarregar PATH para reconhecer o comando nvm
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
    
    # Instalar e usar a versão específica do Node.js
    nvm install 18.20.5
    nvm use 18.20.5
    
    $currentVersion = (node --version)
    if ($currentVersion -eq $targetNodeVersion) {
        Write-ColoredMessage "Node.js $targetNodeVersion instalado com sucesso!" Green
        $nodeInstalled = $true
    } else {
        Write-ColoredMessage "Falha ao instalar Node.js $targetNodeVersion. Versão atual: $currentVersion" Red
    }
}

# Instalar Git
$gitInstalled = Install-ChocolateyPackage -PackageName "git" -DisplayName "Git"

# Instalar Redis
$redisInstalled = $false
Write-ColoredMessage "Verificando se Redis está instalado..." Yellow

# Tentar instalar Redis usando choco
Write-ColoredMessage "Instalando Redis via Chocolatey..." Yellow
choco install redis-64 -y --force

# Verificar se a instalação foi bem-sucedida e tentar encontrar o Redis
$redisPaths = @(
    "${env:ProgramFiles}\Redis\redis-server.exe",
    "${env:ProgramFiles(x86)}\Redis\redis-server.exe",
    "$env:ChocolateyInstall\lib\redis-64\tools\redis-server.exe"
)

foreach ($path in $redisPaths) {
    if (Test-Path $path) {
        Write-ColoredMessage "Redis encontrado em: $path" Green
        $redisPath = $path
        $redisInstalled = $true
        break
    }
}

if (-not $redisInstalled) {
    # Tentar abordagem alternativa - baixar e extrair Redis diretamente
    Write-ColoredMessage "Instalação via Chocolatey não funcionou. Tentando baixar Redis diretamente..." Yellow
    
    # Criar pasta para Redis
    $redisFolder = "$env:ProgramFiles\Redis"
    New-Item -Path $redisFolder -ItemType Directory -Force | Out-Null
    
    # URL de download do Redis para Windows
    $redisUrl = "https://github.com/microsoftarchive/redis/releases/download/win-3.2.100/Redis-x64-3.2.100.zip"
    $redisZip = "$env:TEMP\redis.zip"
    
    # Baixar Redis
    try {
        Invoke-WebRequest -Uri $redisUrl -OutFile $redisZip
        
        # Extrair Redis
        Add-Type -AssemblyName System.IO.Compression.FileSystem
        [System.IO.Compression.ZipFile]::ExtractToDirectory($redisZip, $redisFolder)
        
        # Verificar se redis-server.exe existe
        $redisPath = "$redisFolder\redis-server.exe"
        if (Test-Path $redisPath) {
            $redisInstalled = $true
            Write-ColoredMessage "Redis instalado manualmente com sucesso!" Green
        }
    }
    catch {
        Write-ColoredMessage "Erro ao baixar ou extrair Redis: $_" Red
    }
}

# Tentativa final - verificar novamente se redis-server está no PATH
if (-not $redisInstalled) {
    $redisServerPath = Get-Command redis-server -ErrorAction SilentlyContinue
    if ($redisServerPath) {
        $redisPath = $redisServerPath.Path
        $redisInstalled = $true
        Write-ColoredMessage "Redis encontrado no PATH: $redisPath" Green
    }
}

# Verificar resultados das instalações
if ($nodeInstalled -and $gitInstalled -and $redisInstalled) {
    Write-ColoredMessage "Todas as dependências foram instaladas com sucesso!" Green
    
    # Iniciar o serviço Redis ou processo com tratamento de erro
if ($redisInstalled) {
    Write-ColoredMessage "Tentando iniciar o Redis..." Yellow
    
    # Primeiro, tentar iniciar como serviço
    $redisService = Get-Service -Name 'redis*' -ErrorAction SilentlyContinue
    
    if ($redisService) {
        Write-ColoredMessage "Iniciando Redis como serviço..." Yellow
        Start-Service $redisService.Name -ErrorAction SilentlyContinue
        Write-ColoredMessage "Serviço Redis iniciado!" Green
    }
    else {
        # Se não houver serviço, iniciar como processo
        Write-ColoredMessage "Iniciando Redis como processo..." Yellow
        try {
            # Criar pasta para logs do Redis
            $redisDataDir = "$env:ProgramFiles\Redis\data"
            New-Item -Path $redisDataDir -ItemType Directory -Force | Out-Null
            
            # Iniciar redis-server em segundo plano
            Start-Process $redisPath -ArgumentList "--maxmemory 100mb" -WindowStyle Hidden
            Write-ColoredMessage "Redis iniciado como processo em segundo plano!" Green
            
            # Criar um script para iniciar Redis na inicialização
            $startupPath = [Environment]::GetFolderPath("Startup")
            $redisStartupScript = Join-Path $startupPath "StartRedis.bat"
            
            @"
@echo off
start "" "$redisPath" --maxmemory 100mb
"@ | Out-File -FilePath $redisStartupScript -Encoding ASCII
            
            Write-ColoredMessage "Script de inicialização do Redis criado em: $redisStartupScript" Green
        }
        catch {
            Write-ColoredMessage "Erro ao iniciar Redis: $_" Red
        }
    }
}
else {
    Write-ColoredMessage "Não foi possível instalar o Redis. O MySender precisará de um servidor Redis para funcionar corretamente." Red
    Write-ColoredMessage "O script continuará, mas você deverá instalar e configurar o Redis manualmente depois." Yellow
}
    
    # Recarregar variáveis de ambiente para garantir que os comandos estejam disponíveis
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
    
    # Mostrar versões instaladas
    Write-ColoredMessage "Versões instaladas:" Cyan
    Write-ColoredMessage "Node.js: $(node --version)" Cyan
    Write-ColoredMessage "npm: $(npm --version)" Cyan
    Write-ColoredMessage "Git: $(git --version)" Cyan
    Write-ColoredMessage "Redis está instalado e executando como serviço" Cyan
} else {
    Write-ColoredMessage "Ocorreram erros durante a instalação de dependências. Abortando instalação." Red
    exit
}

# ===== FUNÇÕES DO SCRIPT ORIGINAL DO MYSENDER =====

# Criar atalho para iniciar MySender
function Create-MySenderShortcut {
    param(
        [string]$InstallPath
    )
    # Caminho do atalho na Área de Trabalho
    $desktopPath = [Environment]::GetFolderPath("Desktop")
    $shortcutPath = Join-Path $desktopPath "MySender.lnk"
    # Criar script batch para iniciar o servidor e abrir o navegador
    $batchScriptPath = Join-Path $InstallPath "start-mysender.bat"
    $batchContent = @"
@echo off
cd /d "$InstallPath"
:: Iniciar o servidor em segundo plano
start /B npm start
echo Servidor iniciado...
:: Abrir o navegador apontando para o sistema
start "" "http://localhost:3000"
:: Aguardar o navegador ser fechado
:loop
timeout /t 3 >nul
tasklist | findstr /i "chrome.exe firefox.exe msedge.exe" >nul
if errorlevel 1 (
    echo Navegador fechado. Encerrando o servidor...
    taskkill /F /IM node.exe
    exit
)
goto loop
"@
    $batchContent | Out-File -FilePath $batchScriptPath -Encoding ASCII
    # Criar o atalho
    $WshShell = New-Object -comObject WScript.Shell
    $Shortcut = $WshShell.CreateShortcut($shortcutPath)
    $Shortcut.TargetPath = $batchScriptPath
    $Shortcut.IconLocation = "shell32.dll,77" # Ícone de aplicativo padrão
    $Shortcut.Description = "Iniciar MySender"
    $Shortcut.WorkingDirectory = $InstallPath
    $Shortcut.Save()
    Write-ColoredMessage "Atalho do MySender criado na Área de Trabalho!" Green
}

# Função esvaziada - não oculta ou restringe mais o acesso à pasta
function Protect-MySenderFolder {
    param(
        [string]$FolderPath
    )
    # Função modificada para não ocultar ou restringir acesso
    Write-ColoredMessage "Instalando MySender com acesso normal à pasta..." Green
}

# Instalar o MySender
function Install-MySender {
    # Criar diretório de instalação
    $mysenderPath = "$env:USERPROFILE\MySender"
    New-Item -Path $mysenderPath -ItemType Directory -Force | Out-Null
    Set-Location $mysenderPath
    # Clonar repositório
    Write-ColoredMessage "Clonando repositório MySender..." Yellow
    git clone https://github.com/mathauscm/MySender.git .
    # Instalar dependências do projeto
    Write-ColoredMessage "Instalando dependências do projeto..." Yellow
    npm install
    # Criar atalho na área de trabalho
    Create-MySenderShortcut -InstallPath $mysenderPath
    # Adicionar variáveis de ambiente para Redis
    Write-ColoredMessage "Configurando variáveis de ambiente para Redis..." Yellow
    [System.Environment]::SetEnvironmentVariable("REDIS_HOST", "localhost", "Machine")
    [System.Environment]::SetEnvironmentVariable("REDIS_PORT", "6379", "Machine")
    # Criar arquivo de ambiente (.env)
    $envContent = @"
REDIS_HOST=localhost
REDIS_PORT=6379
"@
    $envContent | Out-File -FilePath ".env" -Encoding UTF8
    # Não bloqueia mais o acesso à pasta
    Protect-MySenderFolder -FolderPath $mysenderPath
    # Iniciar aplicação
    Write-ColoredMessage "Instalação concluída! Iniciando MySender..." Green
    Start-Process -FilePath "$mysenderPath\start-mysender.bat"
}

# Limpar diretório temporário
Remove-Item -Path $tempDir -Recurse -Force -ErrorAction SilentlyContinue

# Executar instalação do MySender
Write-ColoredMessage "Prosseguindo com a instalação do MySender..." Yellow
Install-MySender

Write-ColoredMessage "Processo de instalação completo!" Green