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
$redisInstalled = Install-ChocolateyPackage -PackageName "redis-64" -DisplayName "Redis"

# Verificar resultados das instalações
if ($nodeInstalled -and $gitInstalled -and $redisInstalled) {
    Write-ColoredMessage "Todas as dependências foram instaladas com sucesso!" Green
    
    # Iniciar o serviço Redis com tratamento de erro
Write-ColoredMessage "Verificando serviço Redis..." Yellow
$redisService = Get-Service -Name 'redis*' -ErrorAction SilentlyContinue
if ($redisService) {
    Write-ColoredMessage "Iniciando o serviço Redis ($($redisService.Name))..." Yellow
    Start-Service $redisService.Name
    Write-ColoredMessage "Serviço Redis iniciado com sucesso!" Green
} else {
    # Tentar iniciar o Redis via comando redis-server se o serviço não estiver registrado
    Write-ColoredMessage "Serviço Redis não encontrado. Tentando iniciar Redis de outra forma..." Yellow
    
    # Verificar se redis-server está disponível no PATH
    $redisServerPath = Get-Command redis-server -ErrorAction SilentlyContinue
    
    if ($redisServerPath) {
        # Iniciar redis-server em segundo plano
        Write-ColoredMessage "Iniciando Redis como processo em segundo plano..." Yellow
        Start-Process redis-server -WindowStyle Hidden
        Write-ColoredMessage "Redis iniciado como processo em segundo plano!" Green
    } else {
        # Tentar encontrar redis-server em locais comuns
        $possiblePaths = @(
            "${env:ProgramFiles}\Redis\redis-server.exe",
            "${env:ProgramFiles(x86)}\Redis\redis-server.exe",
            "$env:ChocolateyInstall\lib\redis-64\tools\redis-server.exe"
        )
        
        $foundRedis = $false
        foreach ($path in $possiblePaths) {
            if (Test-Path $path) {
                Write-ColoredMessage "Encontrado Redis em: $path" Yellow
                Start-Process $path -WindowStyle Hidden
                $foundRedis = $true
                Write-ColoredMessage "Redis iniciado como processo em segundo plano!" Green
                break
            }
        }
        
        if (-not $foundRedis) {
            Write-ColoredMessage "Não foi possível encontrar ou iniciar o Redis. O MySender pode não funcionar corretamente." Red
            Write-ColoredMessage "Aviso: O script continuará, mas você precisará iniciar o Redis manualmente." Yellow
        }
    }
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