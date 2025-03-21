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

# Função para instalar Redis diretamente (sem depender do Chocolatey)
function Install-Redis-Directly {
    Write-ColoredMessage "Instalando Redis diretamente..." Yellow
    
    # Criar pasta para Redis
    $redisFolder = "C:\Redis"
    New-Item -Path $redisFolder -ItemType Directory -Force | Out-Null
    
    # URL de download do Redis para Windows
    $redisUrl = "https://github.com/microsoftarchive/redis/releases/download/win-3.2.100/Redis-x64-3.2.100.zip"
    $redisZip = "$env:TEMP\redis.zip"
    
    try {
        # Baixar Redis
        Write-ColoredMessage "Baixando Redis..." Yellow
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri $redisUrl -OutFile $redisZip
        
        # Extrair Redis
        Write-ColoredMessage "Extraindo Redis..." Yellow
        Add-Type -AssemblyName System.IO.Compression.FileSystem
        [System.IO.Compression.ZipFile]::ExtractToDirectory($redisZip, $redisFolder)
        
        # Adicionar Redis ao PATH do sistema
        Write-ColoredMessage "Adicionando Redis ao PATH..." Yellow
        $currentPath = [Environment]::GetEnvironmentVariable("Path", "Machine")
        if (-not $currentPath.Contains($redisFolder)) {
            [Environment]::SetEnvironmentVariable("Path", "$currentPath;$redisFolder", "Machine")
            # Atualizar PATH na sessão atual
            $env:Path = "$env:Path;$redisFolder"
        }
        
        # Configurar Redis como serviço do Windows
        $redisServerPath = Join-Path $redisFolder "redis-server.exe"
        if (Test-Path $redisServerPath) {
            Write-ColoredMessage "Configurando Redis como serviço..." Yellow
            $redisServicePath = Join-Path $redisFolder "redis-server-service.exe"
            Copy-Item $redisServerPath $redisServicePath
            
            # Criar configuração para o serviço
            $redisConfPath = Join-Path $redisFolder "redis.windows.conf"
            if (Test-Path $redisConfPath) {
                $redisServiceConf = Join-Path $redisFolder "redis.windows.service.conf"
                Copy-Item $redisConfPath $redisServiceConf
                
                # Modificar configuração
                $configContent = Get-Content $redisServiceConf
                $configContent = $configContent -replace "^# maxmemory 100mb", "maxmemory 100mb"
                $configContent | Set-Content $redisServiceConf
                
                # Instalar serviço
                Write-ColoredMessage "Instalando serviço Redis..." Yellow
                Start-Process -FilePath $redisServicePath -ArgumentList "--service-install $redisServiceConf" -Wait -NoNewWindow
                
                # Iniciar serviço
                Write-ColoredMessage "Iniciando serviço Redis..." Yellow
                Start-Process -FilePath $redisServicePath -ArgumentList "--service-start" -Wait -NoNewWindow
                
                return $true
            }
        }
    }
    catch {
        Write-ColoredMessage "Erro ao instalar Redis: $_" Red
    }
    
    return $false
}

# Verificar resultados das instalações
if ($nodeInstalled -and $gitInstalled -and $redisInstalled) {
    Write-ColoredMessage "Todas as dependências foram instaladas com sucesso!" Green
    
    # Instalar Redis
Write-ColoredMessage "Instalando Redis..." Yellow
$redisInstalledSuccessfully = Install-Redis-Directly

# Verificar instalação do Redis
if ($redisInstalledSuccessfully) {
    Write-ColoredMessage "Redis instalado e configurado com sucesso!" Green
    
    # Verificar se o serviço está em execução
    $redisService = Get-Service -Name "redis" -ErrorAction SilentlyContinue
    if ($redisService -and $redisService.Status -eq "Running") {
        Write-ColoredMessage "Serviço Redis está em execução!" Green
    } else {
        Write-ColoredMessage "Iniciando serviço Redis..." Yellow
        Start-Service -Name "redis" -ErrorAction SilentlyContinue
    }
} else {
    Write-ColoredMessage "Falha na instalação do Redis. Tentando método alternativo..." Yellow
    
    # Método alternativo - executar redis-server diretamente
    $redisFolder = "C:\Redis"
    $redisServerPath = Join-Path $redisFolder "redis-server.exe"
    
    if (Test-Path $redisServerPath) {
        # Iniciar redis-server como processo em segundo plano
        Write-ColoredMessage "Iniciando Redis como processo em segundo plano..." Yellow
        Start-Process -FilePath $redisServerPath -WindowStyle Hidden
        
        # Criar script para iniciar Redis no startup
        $startupPath = [Environment]::GetFolderPath("Startup")
        $startupScript = Join-Path $startupPath "StartRedis.bat"
        
        @"
@echo off
start "" "C:\Redis\redis-server.exe"
"@ | Out-File -FilePath $startupScript -Encoding ASCII
        
        Write-ColoredMessage "Redis configurado para iniciar automaticamente." Green
        $redisInstalledSuccessfully = $true
    } else {
        Write-ColoredMessage "Não foi possível instalar o Redis. O MySender pode não funcionar corretamente." Red
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