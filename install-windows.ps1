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
    try {
        Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://chocolatey.org/install.ps1'))
        # Recarregar PATH para reconhecer o comando choco
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
        Write-ColoredMessage "Chocolatey instalado com sucesso." Green
    } catch {
        Write-ColoredMessage "Erro ao instalar Chocolatey: $_" Red
        exit
    }
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
        try {
            choco install $PackageName -y --limit-output
            if ($LASTEXITCODE -ne 0) {
                Write-ColoredMessage "Erro ao instalar $DisplayName. Código de saída: $LASTEXITCODE" Red
                return $false
            }
            Write-ColoredMessage "$DisplayName instalado com sucesso!" Green
            return $true
        } catch {
            Write-ColoredMessage "Erro ao instalar $DisplayName: $_" Red
            return $false
        }
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
        try {
            choco uninstall nodejs nodejs-lts -y --limit-output
        } catch {
            Write-ColoredMessage "Erro ao desinstalar Node.js: $_" Red
        }
    }
}

if (-not $nodeInstalled) {
    Write-ColoredMessage "Instalando Node.js $targetNodeVersion..." Yellow
    # Verificar se o NVM está instalado
    $nvmInstalled = Get-Command nvm -ErrorAction SilentlyContinue
    
    if (-not $nvmInstalled) {
        # Tentar instalar NVM diretamente
        try {
            Write-ColoredMessage "Instalando NVM for Windows..." Yellow
            Install-ChocolateyPackage -PackageName "nvm" -DisplayName "NVM for Windows"
            # Recarregar PATH para reconhecer o comando nvm
            $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
        } catch {
            Write-ColoredMessage "Erro ao instalar NVM: $_" Red
            # Se falhar, tentar instalar Node.js diretamente
            Write-ColoredMessage "Tentando instalar Node.js diretamente..." Yellow
            Install-ChocolateyPackage -PackageName "nodejs-lts" -DisplayName "Node.js LTS"
            $nodeInstalled = (Get-Command node -ErrorAction SilentlyContinue) -ne $null
            if ($nodeInstalled) {
                Write-ColoredMessage "Node.js instalado diretamente. Versão pode ser diferente da esperada." Yellow
            }
        }
    }
    
    # Se NVM for instalado com sucesso, tentar instalar Node.js específico
    if (Get-Command nvm -ErrorAction SilentlyContinue) {
        try {
            # Tentar múltiplas vezes para contornar problemas ocasionais
            $retry = 0
            $maxRetries = 3
            $success = $false
            
            while (-not $success -and $retry -lt $maxRetries) {
                $retry++
                Write-ColoredMessage "Tentativa $retry de $maxRetries: Instalando Node.js $targetNodeVersion via NVM..." Yellow
                
                # Dar tempo para NVM ser completamente instalado
                Start-Sleep -Seconds 2
                
                # Instalar e usar a versão específica do Node.js
                nvm install 18.20.5
                nvm use 18.20.5
                
                # Verificar se a instalação foi bem-sucedida
                $currentVersion = (node --version -ErrorAction SilentlyContinue)
                if ($currentVersion -eq $targetNodeVersion) {
                    $success = $true
                    $nodeInstalled = $true
                    Write-ColoredMessage "Node.js $targetNodeVersion instalado com sucesso!" Green
                } else {
                    Write-ColoredMessage "Falha na tentativa $retry. Tentando novamente..." Yellow
                    Start-Sleep -Seconds 3
                }
            }
            
            if (-not $success) {
                Write-ColoredMessage "Não foi possível instalar Node.js $targetNodeVersion após $maxRetries tentativas." Red
                Write-ColoredMessage "Tentando método alternativo..." Yellow
                Install-ChocolateyPackage -PackageName "nodejs-lts" -DisplayName "Node.js LTS"
                $nodeInstalled = (Get-Command node -ErrorAction SilentlyContinue) -ne $null
            }
        } catch {
            Write-ColoredMessage "Erro ao instalar Node.js via NVM: $_" Red
            Write-ColoredMessage "Tentando método alternativo..." Yellow
            Install-ChocolateyPackage -PackageName "nodejs-lts" -DisplayName "Node.js LTS"
            $nodeInstalled = (Get-Command node -ErrorAction SilentlyContinue) -ne $null
        }
    }
}

# Instalar Git
$gitInstalled = Install-ChocolateyPackage -PackageName "git" -DisplayName "Git"

# Função para instalar Redis diretamente (sem depender do Chocolatey)
function Install-Redis-Directly {
    Write-ColoredMessage "Instalando Redis diretamente..." Yellow
    
    # Criar pasta para Redis
    $redisFolder = "C:\Redis"
    if (Test-Path $redisFolder) {
        Write-ColoredMessage "Diretório Redis já existe, limpando..." Yellow
        Remove-Item -Path "$redisFolder\*" -Recurse -Force -ErrorAction SilentlyContinue
    } else {
        New-Item -Path $redisFolder -ItemType Directory -Force | Out-Null
    }
    
    # URL de download do Redis para Windows
    $redisUrl = "https://github.com/microsoftarchive/redis/releases/download/win-3.2.100/Redis-x64-3.2.100.zip"
    $redisZip = "$tempDir\redis.zip"
    
    try {
        # Baixar Redis
        Write-ColoredMessage "Baixando Redis..." Yellow
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        
        # Usar um método mais robusto para download
        try {
            $webClient = New-Object System.Net.WebClient
            $webClient.DownloadFile($redisUrl, $redisZip)
        } catch {
            Write-ColoredMessage "Falha no primeiro método de download, tentando alternativo..." Yellow
            Invoke-WebRequest -Uri $redisUrl -OutFile $redisZip -UseBasicParsing
        }
        
        if (-not (Test-Path $redisZip)) {
            throw "Arquivo ZIP do Redis não foi baixado corretamente"
        }
        
        # Extrair Redis
        Write-ColoredMessage "Extraindo Redis para $redisFolder..." Yellow
        Add-Type -AssemblyName System.IO.Compression.FileSystem
        
        try {
            [System.IO.Compression.ZipFile]::ExtractToDirectory($redisZip, $redisFolder)
        } catch {
            Write-ColoredMessage "Erro na extração, tentando método alternativo..." Yellow
            # Método alternativo usando Expand-Archive
            Expand-Archive -Path $redisZip -DestinationPath $redisFolder -Force
        }
        
        # Verificar se os arquivos foram extraídos
        if (-not (Test-Path "$redisFolder\redis-server.exe")) {
            throw "Arquivos do Redis não foram extraídos corretamente"
        }
        
        # Adicionar Redis ao PATH do sistema
        Write-ColoredMessage "Adicionando Redis ao PATH..." Yellow
        $currentPath = [Environment]::GetEnvironmentVariable("Path", "Machine")
        if (-not $currentPath.Contains($redisFolder)) {
            [Environment]::SetEnvironmentVariable("Path", "$currentPath;$redisFolder", "Machine")
            # Atualizar PATH na sessão atual
            $env:Path = "$env:Path;$redisFolder"
        }
        
        # Verificar se os arquivos de configuração existem
        $redisServerPath = Join-Path $redisFolder "redis-server.exe"
        $redisConfPath = Join-Path $redisFolder "redis.windows.conf"
        
        if (-not (Test-Path $redisConfPath)) {
            Write-ColoredMessage "Arquivo de configuração do Redis não encontrado, criando..." Yellow
            @"
# Redis Windows configuration file

# Basic configuration
port 6379
bind 127.0.0.1
maxmemory 100mb
maxmemory-policy allkeys-lru
"@ | Out-File -FilePath $redisConfPath -Encoding ASCII
        }
        
        # Configurar Redis como serviço do Windows
        if (Test-Path $redisServerPath) {
            Write-ColoredMessage "Configurando Redis como serviço..." Yellow
            
            # Verificar se o serviço já existe
            $existingService = Get-Service -Name "Redis" -ErrorAction SilentlyContinue
            if ($existingService) {
                Write-ColoredMessage "Serviço Redis já existe, removendo..." Yellow
                Start-Process -FilePath "sc.exe" -ArgumentList "delete Redis" -Wait -NoNewWindow
            }
            
            # Copiar servidor para arquivo de serviço
            $redisServicePath = Join-Path $redisFolder "redis-server-service.exe"
            Copy-Item $redisServerPath $redisServicePath -Force
            
            # Criar configuração para o serviço
            $redisServiceConf = Join-Path $redisFolder "redis.windows.service.conf"
            Copy-Item $redisConfPath $redisServiceConf -Force
            
            # Modificar configuração
            $configContent = Get-Content $redisServiceConf
            $configContent = $configContent -replace "^# maxmemory 100mb", "maxmemory 100mb"
            $configContent | Set-Content $redisServiceConf
            
            # Instalar serviço utilizando o utilitário SC diretamente
            try {
                # Primeiro método - usando redis-server com parâmetro --service-install
                Write-ColoredMessage "Instalando serviço Redis (método 1)..." Yellow
                Start-Process -FilePath $redisServicePath -ArgumentList "--service-install `"$redisServiceConf`" --service-name Redis" -Wait -NoNewWindow
            } catch {
                Write-ColoredMessage "Falha ao instalar serviço Redis usando método 1, tentando método alternativo..." Yellow
                
                # Método alternativo usando SC
                Start-Process -FilePath "sc.exe" -ArgumentList "create Redis binPath= `"$redisServicePath --service-run $redisServiceConf`" start= auto" -Wait -NoNewWindow
            }
            
            # Iniciar serviço
            Write-ColoredMessage "Iniciando serviço Redis..." Yellow
            try {
                Start-Service -Name "Redis" -ErrorAction Stop
            } catch {
                Write-ColoredMessage "Falha ao iniciar serviço usando Start-Service, tentando método alternativo..." Yellow
                Start-Process -FilePath "net" -ArgumentList "start Redis" -Wait -NoNewWindow
            }
            
            # Verificar se o serviço está em execução
            $redisService = Get-Service -Name "Redis" -ErrorAction SilentlyContinue
            if ($redisService -and $redisService.Status -eq "Running") {
                Write-ColoredMessage "Serviço Redis está em execução!" Green
                return $true
            } else {
                throw "Serviço Redis não está em execução após várias tentativas"
            }
        } else {
            throw "O executável do Redis não foi encontrado após a extração"
        }
    }
    catch {
        Write-ColoredMessage "Erro ao instalar Redis como serviço: $_" Red
        return $false
    }
}

# Método alternativo para instalar Redis usando Chocolatey
function Install-Redis-Chocolatey {
    Write-ColoredMessage "Tentando instalar Redis via Chocolatey..." Yellow
    
    try {
        choco install redis-64 -y --limit-output
        
        # Verificar se o serviço está em execução
        $redisService = Get-Service -Name "Redis" -ErrorAction SilentlyContinue
        if ($redisService) {
            if ($redisService.Status -ne "Running") {
                Write-ColoredMessage "Iniciando serviço Redis..." Yellow
                Start-Service -Name "Redis" -ErrorAction SilentlyContinue
            }
            
            Write-ColoredMessage "Redis instalado via Chocolatey e serviço em execução!" Green
            return $true
        }
    } catch {
        Write-ColoredMessage "Erro ao instalar Redis via Chocolatey: $_" Red
    }
    
    return $false
}

# Método alternativo para executar Redis diretamente
function Run-Redis-Directly {
    Write-ColoredMessage "Configurando Redis para execução direta..." Yellow
    
    $redisFolder = "C:\Redis"
    $redisServerPath = Join-Path $redisFolder "redis-server.exe"
    
    if (Test-Path $redisServerPath) {
        try {
            # Iniciar redis-server como processo em segundo plano
            Write-ColoredMessage "Iniciando Redis como processo em segundo plano..." Yellow
            $process = Start-Process -FilePath $redisServerPath -WindowStyle Hidden -PassThru
            
            # Verificar se o processo foi iniciado
            if ($process -and (-not $process.HasExited)) {
                Write-ColoredMessage "Redis está em execução como processo!" Green
                
                # Criar script para iniciar Redis no startup
                $startupPath = [Environment]::GetFolderPath("Startup")
                $startupScript = Join-Path $startupPath "StartRedis.bat"
                
                @"
@echo off
start "" "C:\Redis\redis-server.exe"
"@ | Out-File -FilePath $startupScript -Encoding ASCII
                
                Write-ColoredMessage "Redis configurado para iniciar automaticamente." Green
                return $true
            } else {
                Write-ColoredMessage "Falha ao iniciar Redis como processo." Red
                return $false
            }
        } catch {
            Write-ColoredMessage "Erro ao executar Redis diretamente: $_" Red
            return $false
        }
    } else {
        Write-ColoredMessage "Executável do Redis não encontrado em $redisServerPath" Red
        return $false
    }
}

# Tentar instalar Redis
Write-ColoredMessage "Iniciando instalação do Redis..." Yellow
$redisInstalled = $false

# Primeira tentativa: método direto
$redisInstalled = Install-Redis-Directly

# Segunda tentativa: via Chocolatey
if (-not $redisInstalled) {
    Write-ColoredMessage "Falha na instalação direta do Redis, tentando via Chocolatey..." Yellow
    $redisInstalled = Install-Redis-Chocolatey
}

# Terceira tentativa: executar diretamente
if (-not $redisInstalled) {
    Write-ColoredMessage "Falha na instalação do Redis como serviço, tentando execução direta..." Yellow
    $redisInstalled = Run-Redis-Directly
}

# Verificar resultados das instalações
if ($nodeInstalled -and $gitInstalled -and $redisInstalled) {
    Write-ColoredMessage "Todas as dependências foram instaladas com sucesso!" Green
    
    # Recarregar variáveis de ambiente para garantir que os comandos estejam disponíveis
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
    
    # Mostrar versões instaladas
    Write-ColoredMessage "Versões instaladas:" Cyan
    $nodeVersion = $(try { node --version } catch { "Não disponível" })
    $npmVersion = $(try { npm --version } catch { "Não disponível" })
    $gitVersion = $(try { git --version } catch { "Não disponível" })
    
    Write-ColoredMessage "Node.js: $nodeVersion" Cyan
    Write-ColoredMessage "npm: $npmVersion" Cyan
    Write-ColoredMessage "Git: $gitVersion" Cyan
    Write-ColoredMessage "Redis está instalado e em execução" Cyan
} else {
    Write-ColoredMessage "Atenção: Algumas dependências podem não ter sido instaladas corretamente." Yellow
    
    if (-not $nodeInstalled) {
        Write-ColoredMessage "Node.js: FALHA NA INSTALAÇÃO" Red
    }
    
    if (-not $gitInstalled) {
        Write-ColoredMessage "Git: FALHA NA INSTALAÇÃO" Red
    }
    
    if (-not $redisInstalled) {
        Write-ColoredMessage "Redis: FALHA NA INSTALAÇÃO" Red
        Write-ColoredMessage "O MySender pode ter problemas com o Redis, mas tentaremos continuar mesmo assim." Yellow
    }
    
    $continueAnyway = $true
    if (-not ($nodeInstalled -and $gitInstalled)) {
        $continueAnyway = $false
        Write-ColoredMessage "Dependências críticas (Node.js e/ou Git) não foram instaladas. Abortando instalação." Red
        exit
    }
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
    
    # Criar um script VBS para executar o batch sem mostrar a janela do console
    $vbsScriptPath = Join-Path $InstallPath "start-mysender-hidden.vbs"
    $batchScriptPath = Join-Path $InstallPath "start-mysender.bat"
    
    # Conteúdo do script batch
    $batchContent = @"
@echo off
cd /d "$InstallPath"

:: Verificar se o Redis está em execução
redis-cli ping > nul 2>&1
if %ERRORLEVEL% neq 0 (
    :: Tentar iniciar como serviço
    net start Redis > nul 2>&1
    
    :: Se falhar, tentar iniciar diretamente
    if %ERRORLEVEL% neq 0 (
        start /MIN "" "C:\Redis\redis-server.exe" --maxheap 100m
        timeout /t 2 > nul
    )
)

:: Iniciar o servidor Node.js como um processo em segundo plano
start /B /MIN "" cmd /c "npm start > mysender.log 2>&1"

:: Aguardar servidor iniciar completamente
timeout /t 5 > nul

:: Criar um arquivo que indica que o servidor está em execução
echo %date% %time% > running.flag

:: Abrir o navegador apontando para o sistema
start "" "http://localhost:3030"

:: Aguardar o navegador ser fechado
:loop
timeout /t 3 > nul
tasklist | findstr /i "chrome.exe firefox.exe msedge.exe iexplore.exe" > nul
if errorlevel 1 (
    :: Encerrar o servidor quando o navegador for fechado
    taskkill /F /IM node.exe > nul 2>&1
    del running.flag > nul 2>&1
    exit
)
goto loop
"@
    $batchContent | Out-File -FilePath $batchScriptPath -Encoding ASCII

    # Conteúdo do script VBS para executar o batch sem mostrar a janela
    $vbsContent = @"
' Script para executar MySender sem mostrar a janela do console
Option Explicit
Dim WShell, strCommand

Set WShell = CreateObject("WScript.Shell")
strCommand = """$batchScriptPath"""

' Executa o comando sem mostrar janela (0 = oculto)
WShell.Run strCommand, 0, False
"@
    $vbsContent | Out-File -FilePath $vbsScriptPath -Encoding ASCII
    
    # Criar o atalho apontando para o script VBS
    try {
        $WshShell = New-Object -comObject WScript.Shell
        $Shortcut = $WshShell.CreateShortcut($shortcutPath)
        $Shortcut.TargetPath = $vbsScriptPath
        $Shortcut.IconLocation = "shell32.dll,77" # Ícone de aplicativo padrão
        $Shortcut.Description = "Iniciar MySender"
        $Shortcut.WorkingDirectory = $InstallPath
        $Shortcut.Save()
        
        # Criar também um atalho para parar o servidor se necessário
        $stopScriptPath = Join-Path $InstallPath "stop-mysender.bat"
        $stopContent = @"
@echo off
echo Encerrando MySender...
taskkill /F /IM node.exe > nul 2>&1
del "$InstallPath\running.flag" > nul 2>&1
echo MySender foi encerrado.
timeout /t 3 > nul
"@
        $stopContent | Out-File -FilePath $stopScriptPath -Encoding ASCII
        
        Write-ColoredMessage "Atalho do MySender criado na Área de Trabalho!" Green
        Write-ColoredMessage "O servidor agora será executado em segundo plano, sem mostrar a janela do console." Green
    } catch {
        Write-ColoredMessage "Erro ao criar atalho: $_" Red
        Write-ColoredMessage "Você pode iniciar o MySender manualmente executando $vbsScriptPath" Yellow
    }
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
    try {
        # Criar diretório de instalação
        $mysenderPath = "$env:USERPROFILE\MySender"
        
        # Verificar se o diretório já existe
        if (Test-Path $mysenderPath) {
            Write-ColoredMessage "Diretório MySender já existe. Deseja reinstalar? (S/N)" Yellow
            $response = Read-Host
            if ($response -eq "S" -or $response -eq "s") {
                Write-ColoredMessage "Removendo instalação anterior..." Yellow
                Remove-Item -Path $mysenderPath -Recurse -Force
            } else {
                Write-ColoredMessage "Instalação cancelada pelo usuário." Yellow
                return
            }
        }
        
        New-Item -Path $mysenderPath -ItemType Directory -Force | Out-Null
        Set-Location $mysenderPath
        
        # Clonar repositório
        Write-ColoredMessage "Clonando repositório MySender..." Yellow
        $gitResult = $null
        try {
            $gitResult = git clone https://github.com/mathauscm/MySender.git . 2>&1
        } catch {
            Write-ColoredMessage "Erro ao clonar repositório: $_" Red
            Write-ColoredMessage "Detalhes: $gitResult" Red
            return
        }
        
        # Verificar se o clone foi bem-sucedido
        if (-not (Test-Path "$mysenderPath\package.json")) {
            Write-ColoredMessage "Falha ao clonar repositório. package.json não encontrado." Red
            return
        }
        
        # Instalar dependências do projeto
        Write-ColoredMessage "Instalando dependências do projeto..." Yellow
        try {
            npm install --no-audit --no-fund
        } catch {
            Write-ColoredMessage "Erro ao instalar dependências: $_" Red
            Write-ColoredMessage "Tentando novamente com opções adicionais..." Yellow
            
            # Tentar novamente com mais opções
            npm install --no-audit --no-fund --legacy-peer-deps
        }
        
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
        
        $vbsScript = Join-Path $mysenderPath "start-mysender-hidden.vbs"
        if (Test-Path $vbsScript) {
            Start-Process -FilePath $vbsScript
            Write-ColoredMessage "MySender iniciado com sucesso em segundo plano!" Green
            Write-ColoredMessage "Um atalho foi criado na sua Área de Trabalho para iniciar o MySender." Green
            Write-ColoredMessage "O servidor será executado sem mostrar janelas de console." Green
        } else {
            Write-ColoredMessage "Script de inicialização não encontrado. Verifique a instalação." Red
        }
    } catch {
        Write-ColoredMessage "Erro durante a instalação do MySender: $_" Red
    }
}

# Limpar diretório temporário
Remove-Item -Path $tempDir -Recurse -Force -ErrorAction SilentlyContinue

# Executar instalação do MySender
Write-ColoredMessage "Prosseguindo com a instalação do MySender..." Yellow
Install-MySender

Write-ColoredMessage "Processo de instalação completo!" Green