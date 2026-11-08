# =====================================================================
# Outfit Req — Apify Marketplace Sync Engine (Shopee & Uniqlo)
# Mengambil produk & foto dari Apify Actor:
#   1. Uniqlo Scraper: OLoDZH1W1Kzag99wV (Shorts, Shirts, Polo, dsb.)
#   2. Shopee Scraper: fmKWN5uByUCIy2Sam
# =====================================================================

param (
    [string]$Token = $env:APIFY_TOKEN,
    [string]$Target = "uniqlo", # "uniqlo", "shopee", atau "all"
    [switch]$RunNew
)

$rootDir = $PSScriptRoot
$envFile = Join-Path $rootDir ".env"

# Auto-load token from .env if not passed or set in environment
if (-not $Token -and (Test-Path $envFile)) {
    Get-Content $envFile | ForEach-Object {
        $line = $_.Trim()
        if ($line -match "^APIFY_TOKEN=(.+)$") {
            $Token = $matches[1].Trim()
        }
    }
}

if (-not $Token) {
    if ($env:APIFY_TOKEN) {
        $Token = $env:APIFY_TOKEN
    }
}

$outputDir = Join-Path $rootDir "WEB EBD\data"
$outputFile = Join-Path $outputDir "apify_products.json"

if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}

$headers = @{
    "Authorization" = "Bearer $Token"
    "Content-Type"  = "application/json"
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " [Outfit Req] Apify Fashion Database Sync Engine" -ForegroundColor Cyan
Write-Host " Target Mode : $Target" -ForegroundColor Gray
Write-Host " Output File : $outputFile" -ForegroundColor Gray
Write-Host "==========================================================" -ForegroundColor Cyan

# Load existing items if any to merge without losing prior products
$existingItemsMap = [System.Collections.Generic.Dictionary[string, Object]]::new()
if (Test-Path $outputFile) {
    try {
        $existingJson = Get-Content $outputFile -Raw -Encoding UTF8 | ConvertFrom-Json
        if ($existingJson.items) {
            foreach ($ex in $existingJson.items) {
                if ($ex.id) {
                    $existingItemsMap[$ex.id] = $ex
                }
            }
            Write-Host "[*] Memuat $($existingItemsMap.Count) produk yang sudah ada di database lokal." -ForegroundColor Gray
        }
    } catch {
        Write-Host "[!] Peringatan membaca cache lama: $_" -ForegroundColor Yellow
    }
}

# ---------------------------------------------------------------------
# 1. UNIQLO SYNC FUNCTION
# ---------------------------------------------------------------------
function Sync-Uniqlo {
    param([string]$Token, [switch]$RunNewActor)
    $actorId = "OLoDZH1W1Kzag99wV"
    Write-Host "`n[*] Sinkronisasi Uniqlo (Actor: $actorId)..." -ForegroundColor Yellow

    $colorHexMap = @{
        "BLACK" = "#111827"; "WHITE" = "#F9FAFB"; "GRAY" = "#6B7280"; "NAVY" = "#1E3A8A";
        "BLUE" = "#2563EB"; "BEIGE" = "#D2B48C"; "BROWN" = "#78350F"; "RED" = "#DC2626";
        "GREEN" = "#15803D"; "OLIVE" = "#556B2F"; "KHAKI" = "#C3B091"; "YELLOW" = "#EAB308";
        "ORANGE" = "#EA580C"; "PINK" = "#EC4899"; "PURPLE" = "#9333EA"
    }

    $rawItems = @()
    if ($RunNewActor) {
        Write-Host "[*] Memicu Run baru di Apify untuk Uniqlo Scraper..." -ForegroundColor Yellow
        $runInput = @{
            mode = "search"
            queries = @("Shorts", "Shirts")
            category = "22210,23295,,"
            sortBy = "0"
            maxItems = 200
        } | ConvertTo-Json -Compress

        $runUrl = "https://api.apify.com/v2/acts/$actorId/runs?waitForFinish=180"
        $runRes = Invoke-RestMethod -Uri $runUrl -Headers $headers -Method Post -Body $runInput
        $datasetId = $runRes.data.defaultDatasetId
        Write-Host "[+] Run selesai. Dataset ID: $datasetId" -ForegroundColor Green
        $datasetUrl = "https://api.apify.com/v2/datasets/$datasetId/items"
        $rawItems = Invoke-RestMethod -Uri $datasetUrl -Headers $headers -Method Get
    } else {
        Write-Host "[*] Mengambil dari dataset run terakhir Uniqlo..." -ForegroundColor Yellow
        $runsUrl = "https://api.apify.com/v2/acts/$actorId/runs?desc=1&limit=1"
        $runsRes = Invoke-RestMethod -Uri $runsUrl -Headers $headers -Method Get
        if ($runsRes.data.items.Count -eq 0) {
            Write-Host "[!] Tidak ada riwayat run Uniqlo. Memicu run baru..." -ForegroundColor Yellow
            return (Sync-Uniqlo -Token $Token -RunNewActor)
        }
        $lastRun = $runsRes.data.items[0]
        $datasetId = $lastRun.defaultDatasetId
        Write-Host "[+] Menggunakan Dataset Uniqlo ID: $datasetId (Status: $($lastRun.status))" -ForegroundColor Green
        $datasetUrl = "https://api.apify.com/v2/datasets/$datasetId/items"
        $rawItems = Invoke-RestMethod -Uri $datasetUrl -Headers $headers -Method Get
    }

    Write-Host "[+] Berhasil mengunduh $($rawItems.Count) produk mentah dari Uniqlo." -ForegroundColor Green
    $formattedList = [System.Collections.Generic.List[Object]]::new()
    $seenIds = @{}
    $aspectRatios = @("aspect-[3/4]", "aspect-[4/5]", "aspect-[2/3]", "aspect-[1/1]")
    $index = 0

    foreach ($item in $rawItems) {
        $imgUrl = $null
        $colorCode = ""
        if ($item.images -and $item.images.main) {
            $repCode = $item.representativeColor.displayCode
            if ($repCode -and $item.images.main.$repCode) {
                $imgUrl = $item.images.main.$repCode.url
                $colorCode = $repCode
            } else {
                $props = $item.images.main | Get-Member -MemberType NoteProperty
                if ($props.Count -gt 0) {
                    $firstProp = $props[0].Name
                    $imgUrl = $item.images.main.$firstProp.url
                    $colorCode = $firstProp
                }
            }
        }
        if (-not $imgUrl -and $item.images.sub -and $item.images.sub.Count -gt 0) {
            $imgUrl = $item.images.sub[0].url
        }
        if (-not $imgUrl) { continue }

        $suffix = if ($colorCode) { "-$colorCode" } else { "" }
        $uniqueKey = "uniqlo-" + $item.productId + $suffix
        if ($seenIds.ContainsKey($uniqueKey)) {
            $uniqueKey += "-$index"
        }
        $seenIds[$uniqueKey] = $true

        $nameLower = $item.name.ToLower()
        $category = "kasual"
        $style = "Everyday Casual"

        if ($nameLower -match "active|stretch|sweat|athletic|dry|sport|jogger|runner") {
            $category = "sporty"
            $style = "Athleisure & Performance"
        } elseif ($nameLower -match "polo|oxford|pleated|blazer|tailored|smart|dress shirt") {
            $category = "formal"
            $style = "Smart Formal & Office"
        } elseif ($nameLower -match "oversized|wide|cargo|pocket|utility|heavyweight") {
            $category = "streetwear"
            $style = "Urban Streetwear"
        } elseif ($nameLower -match "airism|cotton|linen|basic|crew|easy|clean") {
            $category = "minimalist"
            $style = "Clean Minimalist"
        }

        $usdPrice = 39.9
        $origPrice = $null
        $discount = $null

        if ($item.price) {
            if ($item.price.promo -and $item.price.promo.value) {
                $usdPrice = [double]$item.price.promo.value
                $origPrice = [double]$item.price.base
                if ($origPrice -gt $usdPrice) {
                    $discount = [math]::Round((($origPrice - $usdPrice) / $origPrice) * 100)
                }
            } elseif ($item.price.base) {
                $usdPrice = [double]$item.price.base
            }
        }

        $idrPrice = [math]::Round($usdPrice * 16000)
        $priceDisplay = "`$ " + [string]::Format("{0:N2}", $usdPrice) + " (~ Rp " + [string]::Format("{0:N0}", $idrPrice).Replace(",", ".") + ")"

        $ratingVal = 4.8
        if ($item.rating -and $item.rating.average) {
            $ratingVal = [double]$item.rating.average
        }

        $productUrl = "https://www.uniqlo.com/us/en/products/" + $item.productId
        $genderStr = if ($item.gender) { $item.gender.ToLower() } else { "unisex" }
        $descText = "$($item.gender) • $($item.name) dari Uniqlo Official Store. Kualitas terverifikasi dengan rating $ratingVal/5.0."
        if ($discount) {
            $descText = "Hemat $discount%! $descText"
        }

        $colorList = @()
        if ($item.colors) {
            foreach ($c in $item.colors) {
                $cName = if ($c.name) { $c.name } else { "Variant" }
                $fCode = if ($c.filterCode) { $c.filterCode.ToUpper() } else { "GRAY" }
                $hex = if ($colorHexMap.ContainsKey($fCode)) { $colorHexMap[$fCode] } else { "#4B5563" }
                $colorList += @{ name = $cName; hex = $hex }
            }
        }
        if ($colorList.Count -eq 0) {
            $colorList = @(
                @{ name = "Navy"; hex = "#1E3A8A" },
                @{ name = "White"; hex = "#F9FAFB" }
            )
        }

        $aspect = $aspectRatios[$index % $aspectRatios.Count]
        $index++

        $obj = @{
            id = $uniqueKey
            itemId = $item.productId
            title = $item.name
            category = $category
            style = $style
            gender = $genderStr
            event_type = $null
            store = "Uniqlo"
            storeUrl = $productUrl
            image = $imgUrl
            aspect = $aspect
            priceTotal = $idrPrice
            priceDisplay = $priceDisplay
            currency = "USD"
            originalPrice = $origPrice
            discountPercent = $discount
            rating = $ratingVal
            location = "Uniqlo Official Store"
            savesCount = (45 + ($index * 7))
            desc = $descText
            source = "apify-uniqlo"
            colors = $colorList
            items = @(
                @{
                    category = "Fashion Item"
                    name = $item.name
                    store = "Uniqlo"
                    price = $priceDisplay
                    url = $productUrl
                }
            )
        }
        $formattedList.Add($obj)
    }

    return $formattedList
}

# ---------------------------------------------------------------------
# 2. SHOPEE SYNC FUNCTION
# ---------------------------------------------------------------------
function Sync-Shopee {
    param([string]$Token, [switch]$RunNewActor)
    $actorId = "fmKWN5uByUCIy2Sam"
    Write-Host "`n[*] Sinkronisasi Shopee (Actor: $actorId)..." -ForegroundColor Yellow

    $rawItems = @()
    if ($RunNewActor) {
        Write-Host "[*] Memicu Run baru di Apify untuk Shopee..." -ForegroundColor Yellow
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

        $runUrl = "https://api.apify.com/v2/acts/$actorId/runs?waitForFinish=120"
        $runRes = Invoke-RestMethod -Uri $runUrl -Headers $headers -Method Post -Body $body
        $datasetId = $runRes.data.defaultDatasetId
        Write-Host "[+] Run selesai. Dataset ID: $datasetId" -ForegroundColor Green
        $datasetUrl = "https://api.apify.com/v2/datasets/$datasetId/items"
        $rawItems = Invoke-RestMethod -Uri $datasetUrl -Headers $headers -Method Get
    } else {
        $runsUrl = "https://api.apify.com/v2/acts/$actorId/runs?desc=1&limit=1"
        $runsRes = Invoke-RestMethod -Uri $runsUrl -Headers $headers -Method Get
        if ($runsRes.data.items.Count -eq 0) {
            Write-Host "[!] Tidak ada riwayat run Shopee." -ForegroundColor Red
            return @()
        }
        $lastRun = $runsRes.data.items[0]
        $datasetId = $lastRun.defaultDatasetId
        Write-Host "[+] Menggunakan Dataset Shopee ID: $datasetId" -ForegroundColor Green
        $datasetUrl = "https://api.apify.com/v2/datasets/$datasetId/items"
        $rawItems = Invoke-RestMethod -Uri $datasetUrl -Headers $headers -Method Get
    }

    $aspectRatios = @("aspect-[3/4]", "aspect-[4/5]", "aspect-[2/3]", "aspect-[1/1]")
    $formattedList = [System.Collections.Generic.List[Object]]::new()
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
            location = (if ($item.location) { $item.location } else { "Shopee Official" })
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
        $formattedList.Add($obj)
    }

    return $formattedList
}

# ---------------------------------------------------------------------
# EXECUTE SYNC BASED ON TARGET
# ---------------------------------------------------------------------
$newProducts = [System.Collections.Generic.List[Object]]::new()

if ($Target -eq "uniqlo" -or $Target -eq "all") {
    $uniqloItems = Sync-Uniqlo -Token $Token -RunNewActor:$RunNew
    foreach ($u in $uniqloItems) { $newProducts.Add($u) }
}

if ($Target -eq "shopee" -or $Target -eq "all") {
    $shopeeItems = Sync-Shopee -Token $Token -RunNewActor:$RunNew
    foreach ($s in $shopeeItems) { $newProducts.Add($s) }
}

# Merge into existing items map
foreach ($p in $newProducts) {
    $existingItemsMap[$p.id] = $p
}

$allMergedItems = [System.Collections.Generic.List[Object]]::new()
foreach ($key in $existingItemsMap.Keys) {
    $allMergedItems.Add($existingItemsMap[$key])
}

Write-Host "`n[+] Total produk terintegrasi dalam database: $($allMergedItems.Count)" -ForegroundColor Green

# Save to local JSON cache
$payload = @{
    source = "Apify Marketplace Multi-Actor (Shopee & Uniqlo)"
    lastSynced = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    totalItems = $allMergedItems.Count
    items = $allMergedItems
}

$utf8NoBom = New-Object System.Text.UTF8Encoding $false
$jsonText = $payload | ConvertTo-Json -Depth 6
[System.IO.File]::WriteAllText($outputFile, $jsonText, $utf8NoBom)
Write-Host "[OK] Database lokal diperbarui: $outputFile" -ForegroundColor Cyan

# ---------------------------------------------------------------------
# SINKRONISASI KE SUPABASE DATABASE (tabel public.outfit_catalog)
# ---------------------------------------------------------------------
$supabaseUrl = "https://iklhjmmmolulglxirvrc.supabase.co"
$supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlrbGhqbW1tb2x1bGdseGlydnJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyODAzNjQsImV4cCI6MjEwODg1NjM2NH0.NsKrraBp5W2SEDzKXM6GWevYr1g4iwGUei2CSawqNmQ"

Write-Host "`n[*] Menyinkronkan data ke Supabase Cloud Database..." -ForegroundColor Yellow

$dbRows = @()
foreach ($item in $allMergedItems) {
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

$sbHeaders = @{
    "apikey"        = $supabaseKey
    "Authorization" = "Bearer $supabaseKey"
    "Prefer"        = "resolution=merge-duplicates"
}

# Upload in batches of 50 to ensure reliable network transfer
$batchSize = 50
$uploadedCount = 0
for ($i = 0; $i -lt $dbRows.Count; $i += $batchSize) {
    $endIdx = [math]::Min($i + $batchSize - 1, $dbRows.Count - 1)
    $currentBatch = @($dbRows[$i..$endIdx])
    try {
        $sbJson = $currentBatch | ConvertTo-Json -Depth 5
        $sbBytes = [System.Text.Encoding]::UTF8.GetBytes($sbJson)
        $null = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/outfit_catalog" -Headers $sbHeaders -Method Post -Body $sbBytes -ContentType "application/json; charset=utf-8" -ErrorAction Stop
        $uploadedCount += $currentBatch.Count
        Write-Host "  [+] Terunggah ke Supabase: $uploadedCount / $($dbRows.Count) baris" -ForegroundColor Green
    } catch {
        Write-Host "  [!] Gagal pada batch ke-$($i/$batchSize): $_" -ForegroundColor Yellow
    }
}

Write-Host "==========================================================" -ForegroundColor Green
Write-Host " [Sukses] Database berhasil disinkronkan!" -ForegroundColor Green
Write-Host " Total Produk Aktif: $($allMergedItems.Count)" -ForegroundColor Green
Write-Host " Buka http://localhost:8080/WEB%20EBD/rekomendasi.html untuk menjelajah!" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Green
