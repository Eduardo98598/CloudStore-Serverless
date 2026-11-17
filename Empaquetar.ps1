
$ErrorActionPreference = "Stop"

$Root = $PSScriptRoot
$Backend = Join-Path $Root "backend"
$Output = Join-Path $Root "lambda-dist"
$Staging = Join-Path $Output "staging"

$Functions = @("products", "categories", "orders")

# Limpiar salida anterior
if (Test-Path $Output) {
    Remove-Item $Output -Recurse -Force
}

New-Item -ItemType Directory -Path $Staging -Force | Out-Null

foreach ($Function in $Functions) {

    Write-Host "`nEmpaquetando CloudStore-$Function..." -ForegroundColor Cyan

    $Source = Join-Path $Backend $Function
    $Temp = Join-Path $Staging $Function

    if (!(Test-Path (Join-Path $Source "package-lock.json"))) {
        throw "Falta package-lock.json en $Function"
    }

    New-Item -ItemType Directory -Path $Temp -Force | Out-Null

    # Copiar contenido de la función directamente a la raíz
    Copy-Item "$Source\*" $Temp -Recurse -Force

    # Copiar shared directamente a la raíz
    Copy-Item `
        (Join-Path $Backend "shared") `
        (Join-Path $Temp "shared") `
        -Recurse -Force

    # Adaptar imports en la copia temporal
    Get-ChildItem $Temp -Filter "*.js" -File -Recurse |
        ForEach-Object {

            $Content = Get-Content $_.FullName -Raw

            $Content = $Content -replace `
                "require\(['""]\.\./shared/", `
                "require('./shared/"

            Set-Content $_.FullName $Content -Encoding utf8
        }

    # Instalar dependencias de producción
    Push-Location $Temp

    try {
        npm ci --omit=dev

        if ($LASTEXITCODE -ne 0) {
            throw "Error instalando dependencias de $Function"
        }
    }
    finally {
        Pop-Location
    }

    # Comprimir el contenido, no la carpeta contenedora
    $ZipName = "CloudStore-$((Get-Culture).TextInfo.ToTitleCase($Function)).zip"
    $ZipPath = Join-Path $Output $ZipName

    Compress-Archive `
        -Path "$Temp\*" `
        -DestinationPath $ZipPath `
        -CompressionLevel Optimal

    Write-Host "OK: $ZipName" -ForegroundColor Green
}

# Eliminar temporales
Remove-Item $Staging -Recurse -Force

Write-Host "`nLos tres paquetes están listos:" -ForegroundColor Green

Get-ChildItem $Output -Filter "*.zip" |
    Select-Object Name,
        @{Name="Tamaño MB";Expression={[math]::Round($_.Length / 1MB, 2)}}
