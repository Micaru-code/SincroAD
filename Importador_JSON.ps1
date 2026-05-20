# --- CONFIGURACIÓN ---
$rutaEntrada = "C:\SincroAD"
$mysqlPath = "C:\xampp\mysql\bin\mysql.exe" 

if (!(Test-Path $mysqlPath)) {
    Write-Error "¡OJO! No encuentro mysql.exe en $mysqlPath."
    return
}

$userDB = "root"
$passDB = ""

Write-Host "--- Procesando archivos ---" -ForegroundColor Cyan

$archivos = Get-ChildItem -Path $rutaEntrada -Filter "*.json"

foreach ($archivo in $archivos) {
    Write-Host "Leyendo $($archivo.Name)..." -ForegroundColor Yellow
    $data = Get-Content $archivo.FullName -Raw | ConvertFrom-Json
    
    $sede = if ($archivo.Name -like "*mercadona*") { "MERCADONA" } else { "LIDL" }

    foreach ($u in $data.Users) {
        $nombre = $u.Name -replace "'", ""
        $username = $u.SamAccountName
        $email = $u.EmailAddress
        
        $query = "INSERT INTO usuarios (nombre, username, email, dominio_origen) VALUES ('$nombre', '$username', '$email', '$sede');"
        
        & $mysqlPath --user=$userDB --execute="$query" sincroad
    }

    if (!(Test-Path "$rutaEntrada\procesados")) { New-Item -ItemType Directory -Path "$rutaEntrada\procesados" }
    Move-Item $archivo.FullName "$rutaEntrada\procesados\" -Force
    Write-Host "¡Archivo $($archivo.Name) procesado!" -ForegroundColor Green
}