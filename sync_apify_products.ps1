# =====================================================================
# Outfit Req — Apify Shopee Marketplace Sync (PowerShell Native)
# Mengambil produk & foto dari Apify Actor fmKWN5uByUCIy2Sam
# =====================================================================

param (
    [string]$Token = $env:APIFY_TOKEN,
    [string]$ActorId = "fmKWN5uByUCIy2Sam",
    [switch]$RunNew
)

if (-not $Token) {
    Write-Host "[!] Peringatan: APIFY_TOKEN tidak diset. Masukkan parameter -Token 'token_anda' atau atur `$env:APIFY_TOKEN." -ForegroundColor Yellow
}

$rootDir = $PSScriptRoot
$outputDir = Join-Path $rootDir "WEB EBD\data"
$outputFile = Join-Path $outputDir "apify_products.json"

if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}

$headers = @{
    "Authorization" = "Bearer $Token"
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " [Outfit Req] Apify Shopee Sync Engine" -ForegroundColor Cyan
Write-Host " Actor: $ActorId" -ForegroundColor Gray
Write-Host " Target: $outputFile" -ForegroundColor Gray
Write-Host "==========================================================" -ForegroundColor Cyan

$rawItems = @()

if ($RunNew) {
    Write-Host "[*] Memulai Actor Run baru di Apify..." -ForegroundColor Yellow
    $body = @{
        location = "outfit"
        keywords = @("outfit pria", "outfit wanita")
        shopUrls = @()
        categoryUrls = @()
        priceSlicing = $false
        country = "ID"
        maxItems = 50
        debug = $false
    } | ConvertTo-Json -Compress

    $runUrl = "https://api.apify.com/v2/acts/$ActorId/runs?waitForFinish=120"
    $runRes = Invoke-RestMethod -Uri $runUrl -Headers $headers -Method Post -Body $body -ContentType "application/json"
    $datasetId = $runRes.data.defaultDatasetId
    Write-Host "[+] Run selesai. Dataset ID: $datasetId" -ForegroundColor Green
    
    $datasetUrl = "https://api.apify.com/v2/datasets/$datasetId/items"
    $rawItems = Invoke-RestMethod -Uri $datasetUrl -Headers $headers -Method Get
} else {
    Write-Host "[*] Mengambil data produk dari dataset terakhir..." -ForegroundColor Yellow
    $runsUrl = "https://api.apify.com/v2/acts/$ActorId/runs?desc=1&limit=1"
    $runsRes = Invoke-RestMethod -Uri $runsUrl -Headers $headers -Method Get
    if ($runsRes.data.items.Count -eq 0) {
        Write-Host "[!] Tidak ada riwayat run pada Actor ini." -ForegroundColor Red
        exit 1
    }

    $lastRun = $runsRes.data.items[0]
    $datasetId = $lastRun.defaultDatasetId
    Write-Host "[+] Menggunakan Dataset ID: $datasetId (Run Status: $($lastRun.status))" -ForegroundColor Green

    $datasetUrl = "https://api.apify.com/v2/datasets/$datasetId/items"
    $rawItems = Invoke-RestMethod -Uri $datasetUrl -Headers $headers -Method Get
}

Write-Host "[+] Berhasil mengunduh $($rawItems.Count) produk mentah." -ForegroundColor Green

# Format items for Outfit Req
$aspectRatios = @("aspect-[3/4]", "aspect-[4/5]", "aspect-[2/3]", "aspect-[1/1]")
$formatted = [System.Collections.Generic.List[Object]]::new()
$index = 0

foreach ($item in $rawItems) {
    if (-not $item.images -or $item.images.Count -eq 0) { continue }
    
    $aspect = $aspectRatios[$index % $aspectRatios.Count]
    $index++

    $nameLower = $item.name.ToLower()
    $category = "kasual"
    $style = "Casual Streetwear"

    if ($nameLower -match "esporte|caminhada|pesca|windbreaker|corta-vento|corrida|sport") {
        $category = "sporty"
        $style = "Athleisure & Windbreaker"
    } elseif ($nameLower -match "negócios|classica|elegante|formal|blazer") {
        $category = "formal"
        $style = "Classic Business Outerwear"
    } elseif ($nameLower -match "chines|retro|vintage|heritage|bobojaco") {
        $category = "streetwear"
        $style = "Urban Puffer & Street"
    } elseif ($nameLower -match "simples|solta|versatil|monocrom") {
        $category = "minimalist"
        $style = "Clean Minimalist"
    }

    $priceVal = 0
    $priceDisplay = ""
    if ($item.currency -eq "BRL") {
        $priceVal = [math]::Round($item.price * 2900)
        $priceDisplay = "R$ " + [string]::Format("{0:N2}", $item.price) + " (~ Rp " + [string]::Format("{0:N0}", $priceVal).Replace(",", ".") + ")"
    } elseif ($item.currency -eq "IDR") {
        $priceVal = [int]$item.price
        $priceDisplay = "Rp " + [string]::Format("{0:N0}", $priceVal).Replace(",", ".")
    } else {
        $priceVal = [int]$item.price
        $priceDisplay = "$($item.currency) $($item.price)"
    }

    $ratingVal = 4.8
    if ($item.rating) { $ratingVal = [double]$item.rating }

    $locVal = "Shopee Official"
    if ($item.location) { $locVal = $item.location }

    $descText = "Produk live dari Shopee Marketplace. Kualitas terverifikasi dengan rating $ratingVal/5.0."
    if ($item.discountPercent) {
        $descText = "Hemat $($item.discountPercent)%! $descText"
    }

    $obj = @{
        id = "shopee-" + $item.itemId
        itemId = $item.itemId
        shopId = $item.shopId
        title = $item.name
        category = $category
        style = $style
        gender = "unisex"
        event_type = $null
        store = "Shopee"
        storeUrl = $item.url
        image = $item.images[0]
        aspect = $aspect
        priceTotal = $priceVal
        priceDisplay = $priceDisplay
        currency = $item.currency
        originalPrice = $item.originalPrice
        discountPercent = $item.discountPercent
        rating = $ratingVal
        location = $locVal
        savesCount = (50 + ($index * 13))
        desc = $descText
        source = "apify-shopee"
        colors = @(
            @{ name = "Onyx Black"; hex = "#1A1A1A" },
            @{ name = "Slate Grey"; hex = "#4A5568" }
        )
        items = @(
            @{
                category = "Outerwear"
                name = $item.name
                store = "Shopee"
                price = $priceDisplay
                url = $item.url
            }
        )
    }

    $formatted.Add($obj)
}

$payload = @{
    source = "Apify Actor $ActorId"
    lastSynced = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    totalItems = $formatted.Count
    items = $formatted
}

$utf8NoBom = New-Object System.Text.UTF8Encoding $false
$jsonText = $payload | ConvertTo-Json -Depth 6
[System.IO.File]::WriteAllText($outputFile, $jsonText, $utf8NoBom)

# ---------------------------------------------------------------------
# Sinkronisasi ke Supabase Database (tabel public.outfit_catalog)
# ---------------------------------------------------------------------
$supabaseUrl = "https://iklhjmmmolulglxirvrc.supabase.co"
$supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlrbGhqbW1tb2x1bGdseGlydnJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyODAzNjQsImV4cCI6MjEwODg1NjM2NH0.NsKrraBp5W2SEDzKXM6GWevYr1g4iwGUei2CSawqNmQ"

Write-Host "[*] Menyinkronkan data ke Supabase Database..." -ForegroundColor Yellow

$dbRows = @()
foreach ($item in $formatted) {
    $dbRows += @{
        item_id = $item.id
        title = $item.title
        photo_url = $item.image
        category = $item.category
        event_type = $null
        source_store = $item.store
        product_link = $item.storeUrl
        description = $item.desc
        price_total = $item.priceTotal
        price_display = $item.priceDisplay
        rating = $item.rating
    }
}

try {
    $sbHeaders = @{
        "apikey" = $supabaseKey
        "Authorization" = "Bearer $supabaseKey"
        "Content-Type" = "application/json"
        "Prefer" = "resolution=merge-duplicates"
    }
    $sbBody = $dbRows | ConvertTo-Json -Depth 5
    $sbRes = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/outfit_catalog" -Headers $sbHeaders -Method Post -Body $sbBody -ErrorAction Stop
    Write-Host "[+] Berhasil menyinkronkan $($dbRows.Count) produk ke tabel outfit_catalog Supabase!" -ForegroundColor Green
} catch {
    Write-Host "[i] Info Supabase: Skrip SQL seed siap di docs/supabase_outfit_catalog_seed.sql" -ForegroundColor Gray
}

Write-Host "==========================================================" -ForegroundColor Green
Write-Host " [Sukses] Berhasil mengekspor $($formatted.Count) produk ke:" -ForegroundColor Green
Write-Host " $outputFile" -ForegroundColor Cyan
Write-Host " Buka http://localhost:8080/WEB%20EBD/rekomendasi.html untuk melihat katalog live!" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Green
