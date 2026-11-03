# =====================================================================
# Outfit Req — Lightweight HTTP Server (PowerShell Native)
# Berjalan langsung di semua versi Windows tanpa Python / Node.js
# =====================================================================

$rootDir = $PSScriptRoot

$mimeTypes = @{
    ".html"  = "text/html; charset=utf-8"
    ".htm"   = "text/html; charset=utf-8"
    ".js"    = "application/javascript; charset=utf-8"
    ".mjs"   = "application/javascript; charset=utf-8"
    ".css"   = "text/css; charset=utf-8"
    ".json"  = "application/json; charset=utf-8"
    ".png"   = "image/png"
    ".jpg"   = "image/jpeg"
    ".jpeg"  = "image/jpeg"
    ".svg"   = "image/svg+xml"
    ".webp"  = "image/webp"
    ".ico"   = "image/x-icon"
    ".gif"   = "image/gif"
    ".woff"  = "font/woff"
    ".woff2" = "font/woff2"
    ".ttf"   = "font/ttf"
    ".mp4"   = "video/mp4"
    ".webm"  = "video/webm"
    ".txt"   = "text/plain; charset=utf-8"
}

# ---------------------------------------------------------------------
# Deteksi Port Bebas (Auto-fallback jika port 8080 sedang digunakan)
# ---------------------------------------------------------------------
$listener = $null
$port = $null

foreach ($candidatePort in 8080..8099) {
    try {
        $candidateListener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, $candidatePort)
        $candidateListener.Start()
        $listener = $candidateListener
        $port = $candidatePort
        break
    } catch {
        # Port sedang dipakai oleh proses lain, lanjutkan cek port berikutnya
    }
}

if (-not $listener) {
    Write-Host "==========================================================" -ForegroundColor Red
    Write-Host " [Gagal] Semua port 8080-8099 sedang digunakan." -ForegroundColor Red
    Write-Host " Silakan tutup jendela server lama Anda terlebih dahulu." -ForegroundColor Red
    Write-Host "==========================================================" -ForegroundColor Red
    exit 1
}

Write-Host "==========================================================" -ForegroundColor Green
Write-Host " [Outfit Req] Server aktif di: http://localhost:$port/" -ForegroundColor Cyan
if ($port -ne 8080) {
    Write-Host " [Catatan] Port 8080 sedang digunakan, otomatis dialihkan ke: http://localhost:$port/" -ForegroundColor Yellow
}
Write-Host " -> Beranda Utama:         http://localhost:$port/WEB%20EBD/index.html" -ForegroundColor Yellow
Write-Host " -> Galeri Rekomendasi:    http://localhost:$port/WEB%20EBD/rekomendasi.html" -ForegroundColor Yellow
Write-Host " -> Halaman Akun:          http://localhost:$port/WEB%20EBD/account.html" -ForegroundColor Yellow
Write-Host " -> Panduan & Tutorial:    http://localhost:$port/WEB%20EBD/tutorial.html" -ForegroundColor Yellow
Write-Host " -> Masuk (Login 3D):      http://localhost:$port/WEB%20EBD/login.html" -ForegroundColor Yellow
Write-Host " [Apify Sync] Sinkronisasi produk: .\sync_apify_products.ps1" -ForegroundColor Magenta
Write-Host " Tekan Ctrl + C di terminal ini untuk menghentikan server." -ForegroundColor Gray
Write-Host "==========================================================" -ForegroundColor Green

# Buka browser secara otomatis ke port yang aktif
try {
    Start-Process "http://localhost:$port/WEB%20EBD/index.html" -ErrorAction SilentlyContinue
} catch {
    # Abaikan jika di lingkungan non-interaktif
}

# ---------------------------------------------------------------------
# Loop Penanganan Request HTTP
# ---------------------------------------------------------------------
while ($true) {
    try {
        $client = $listener.AcceptTcpClient()
        $stream = $client.GetStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $requestLine = $reader.ReadLine()
        if (-not $requestLine) {
            $client.Close()
            continue
        }

        $parts = $requestLine.Split(" ")
        if ($parts.Length -lt 2) {
            $client.Close()
            continue
        }

        $rawPath = $parts[1]
        $cleanPath = [System.Uri]::UnescapeDataString($rawPath.Split("?")[0].Split("#")[0])

        # Pengalihan root '/' langsung ke Beranda Utama
        if ($cleanPath -eq "/" -or $cleanPath -eq "") {
            $body = [System.Text.Encoding]::UTF8.GetBytes("Redirecting to Outfit Req...")
            $header = "HTTP/1.1 302 Found`r`n" +
                      "Location: /WEB%20EBD/index.html`r`n" +
                      "Content-Length: $($body.Length)`r`n" +
                      "Connection: close`r`n`r`n"
            $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
            $stream.Write($headerBytes, 0, $headerBytes.Length)
            $stream.Write($body, 0, $body.Length)
            $stream.Flush()
            $client.Close()
            continue
        }

        $relPath = $cleanPath.TrimStart("/").Replace("/", [System.IO.Path]::DirectorySeparatorChar)
        $localPath = Join-Path $rootDir $relPath

        # Jika path adalah direktori
        if (Test-Path $localPath -PathType Container) {
            if (-not $cleanPath.EndsWith("/")) {
                # Pastikan direktori memiliki trailing slash agar relative links bekerja
                $body = [System.Text.Encoding]::UTF8.GetBytes("Redirecting...")
                $header = "HTTP/1.1 301 Moved Permanently`r`n" +
                          "Location: $cleanPath/`r`n" +
                          "Content-Length: $($body.Length)`r`n" +
                          "Connection: close`r`n`r`n"
                $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
                $stream.Write($headerBytes, 0, $headerBytes.Length)
                $stream.Write($body, 0, $body.Length)
                $stream.Flush()
                $client.Close()
                continue
            }

            $candidateIndex = Join-Path $localPath "index.html"
            if (Test-Path $candidateIndex -PathType Leaf) {
                $localPath = $candidateIndex
            }
        }

        if (Test-Path $localPath -PathType Leaf) {
            $bytes = [System.IO.File]::ReadAllBytes($localPath)
            $ext = [System.IO.Path]::GetExtension($localPath).ToLower()
            $contentType = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { "application/octet-stream" }

            $header = "HTTP/1.1 200 OK`r`n" +
                      "Content-Type: $contentType`r`n" +
                      "Content-Length: $($bytes.Length)`r`n" +
                      "Access-Control-Allow-Origin: *`r`n" +
                      "Cache-Control: no-cache`r`n" +
                      "Connection: close`r`n`r`n"
            $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
            $stream.Write($headerBytes, 0, $headerBytes.Length)
            $stream.Write($bytes, 0, $bytes.Length)
        } else {
            $errBody = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $cleanPath")
            $header = "HTTP/1.1 404 Not Found`r`n" +
                      "Content-Type: text/plain; charset=utf-8`r`n" +
                      "Content-Length: $($errBody.Length)`r`n" +
                      "Access-Control-Allow-Origin: *`r`n" +
                      "Connection: close`r`n`r`n"
            $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
            $stream.Write($headerBytes, 0, $headerBytes.Length)
            $stream.Write($errBody, 0, $errBody.Length)
        }
        $stream.Flush()
        $client.Close()
    } catch {
        # Silent ignore connection drops
    }
}
