


# ----------------------------------------------------------------------
#  KHAI STUDIO - Gallery Image Compressor
# ----------------------------------------------------------------------
#  Resizes and compresses photos for the masonry portfolio gallery.
#  Each image's longest side is set to 1600px, then JPEG-compressed at 82%.
#  Output files are tagged with orientation (landscape/portrait/etc.)
#
#  USAGE:
#    1. Edit the two paths below
#    2. In VS Code PowerShell terminal:
#         .\compress-gallery.ps1
# ----------------------------------------------------------------------


# --- EDIT THESE TWO PATHS ---------------------------------------------
$InputFolder  = "C:\Users\22100\Downloads\Home Page Images\Home Page Images"
$OutputFolder = "C:\Users\22100\OneDrive\Desktop\noorix-works\preepix-final\images\home"

# --- COMPRESSION SETTINGS ---------------------------------------------
$MaxLongSide        = 1600
$JpegQuality        = 82
$AddOrientationTag  = $true
$Renumber           = $true
$Prefix             = "slider-"

# ----------------------------------------------------------------------

Add-Type -AssemblyName System.Drawing

if (-not (Test-Path $InputFolder)) {
    Write-Host ""
    Write-Host "  ERROR: Input folder not found:" -ForegroundColor Red
    Write-Host "  $InputFolder" -ForegroundColor Red
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit
}

if (-not (Test-Path $OutputFolder)) {
    New-Item -ItemType Directory -Path $OutputFolder -Force | Out-Null
}

$ImageFiles = Get-ChildItem -Path $InputFolder -File |
    Where-Object { $_.Extension -match '\.(jpg|jpeg|png|webp|gif|bmp|tiff?)$' } |
    Sort-Object Name

if ($ImageFiles.Count -eq 0) {
    Write-Host ""
    Write-Host "  No images found in: $InputFolder" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit
}

Write-Host ""
Write-Host "  ===========================================================" -ForegroundColor Cyan
Write-Host "    KHAI STUDIO - Gallery Image Compressor" -ForegroundColor Cyan
Write-Host "  ===========================================================" -ForegroundColor Cyan
Write-Host "  Input:        $InputFolder"
Write-Host "  Output:       $OutputFolder"
Write-Host "  Found:        $($ImageFiles.Count) image(s)"
Write-Host "  Max longest:  $MaxLongSide px"
Write-Host "  Quality:      $JpegQuality%"
Write-Host "  ===========================================================" -ForegroundColor Cyan
Write-Host ""

$JpegCodec    = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
                Where-Object { $_.MimeType -eq 'image/jpeg' }
$EncoderParam = New-Object System.Drawing.Imaging.EncoderParameters(1)
$EncoderParam.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter(
    [System.Drawing.Imaging.Encoder]::Quality, [long]$JpegQuality
)

$TotalOriginalKB   = 0
$TotalCompressedKB = 0
$Counter = 1
$Errors  = 0

$OrientationCount = @{ portrait = 0; landscape = 0; square = 0; tall = 0 }

foreach ($file in $ImageFiles) {

    try {
        $originalSizeKB = [math]::Round($file.Length / 1KB, 1)
        $TotalOriginalKB += $originalSizeKB

        $original = [System.Drawing.Image]::FromFile($file.FullName)
        $origW = $original.Width
        $origH = $original.Height
        $ratio = $origW / $origH

        if ($ratio -gt 1.3) {
            $orientation = "landscape"
        } elseif ($ratio -lt 0.7) {
            $orientation = "tall"
        } elseif ($ratio -lt 0.9) {
            $orientation = "portrait"
        } else {
            $orientation = "square"
        }
        $OrientationCount[$orientation]++

        if ($origW -ge $origH) {
            if ($origW -gt $MaxLongSide) {
                $newW = $MaxLongSide
                $newH = [int]($origH * ($MaxLongSide / $origW))
            } else {
                $newW = $origW
                $newH = $origH
            }
        } else {
            if ($origH -gt $MaxLongSide) {
                $newH = $MaxLongSide
                $newW = [int]($origW * ($MaxLongSide / $origH))
            } else {
                $newW = $origW
                $newH = $origH
            }
        }

        if ($Renumber) {
            $name = "{0}{1:D3}" -f $Prefix, $Counter
        } else {
            $name = [System.IO.Path]::GetFileNameWithoutExtension($file.Name)
            if ($Prefix) { $name = "$Prefix$name" }
        }

        if ($AddOrientationTag) {
            $outputName = "$name-$orientation.jpg"
        } else {
            $outputName = "$name.jpg"
        }

        $outputPath = Join-Path $OutputFolder $outputName

        $resized  = New-Object System.Drawing.Bitmap($newW, $newH)
        $graphics = [System.Drawing.Graphics]::FromImage($resized)
        $graphics.InterpolationMode  = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.SmoothingMode      = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $graphics.PixelOffsetMode    = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        $graphics.DrawImage($original, 0, 0, $newW, $newH)

        $resized.Save($outputPath, $JpegCodec, $EncoderParam)

        $graphics.Dispose()
        $resized.Dispose()
        $original.Dispose()

        $compressedSizeKB = [math]::Round((Get-Item $outputPath).Length / 1KB, 1)
        $TotalCompressedKB += $compressedSizeKB

        if ($originalSizeKB -gt 0) {
            $reduction = [math]::Round((1 - ($compressedSizeKB / $originalSizeKB)) * 100, 0)
        } else {
            $reduction = 0
        }

        $color = "Green"
        if ($orientation -eq "portrait")  { $color = "Magenta" }
        if ($orientation -eq "tall")      { $color = "DarkMagenta" }
        if ($orientation -eq "landscape") { $color = "Cyan" }
        if ($orientation -eq "square")    { $color = "Yellow" }

        $tag = "[$orientation]".PadRight(12)

        $shortName = $file.Name
        if ($shortName.Length -gt 32) {
            $shortName = $shortName.Substring(0, 32)
        }
        $shortName = $shortName.PadRight(32)

        Write-Host ("  [{0,3}] {1} {2}  {3,7} KB -> {4,6} KB  ({5}% smaller) -> {6} ({7}x{8})" -f $Counter, $tag, $shortName, $originalSizeKB, $compressedSizeKB, $reduction, $outputName, $newW, $newH) -ForegroundColor $color

        $Counter++

    } catch {
        Write-Host "  [ERR] $($file.Name) - $($_.Exception.Message)" -ForegroundColor Red
        $Errors++
    }
}

$savedMB = [math]::Round(($TotalOriginalKB - $TotalCompressedKB) / 1024, 1)
if ($TotalOriginalKB -gt 0) {
    $totalReduction = [math]::Round((1 - ($TotalCompressedKB / $TotalOriginalKB)) * 100, 0)
} else {
    $totalReduction = 0
}

Write-Host ""
Write-Host "  ===========================================================" -ForegroundColor Cyan
Write-Host "    DONE" -ForegroundColor Cyan
Write-Host "  ===========================================================" -ForegroundColor Cyan
Write-Host ("  Processed:    {0} image(s)" -f ($Counter - 1))
if ($Errors -gt 0) {
    Write-Host ("  Errors:       {0}" -f $Errors) -ForegroundColor Yellow
}
Write-Host ""
Write-Host "  Orientation breakdown:" -ForegroundColor Cyan
Write-Host ("    Landscape:  {0}" -f $OrientationCount.landscape)
Write-Host ("    Portrait:   {0}" -f $OrientationCount.portrait)
Write-Host ("    Tall:       {0}" -f $OrientationCount.tall)
Write-Host ("    Square:     {0}" -f $OrientationCount.square)
Write-Host ""
Write-Host ("  Original:     {0} MB" -f ([math]::Round($TotalOriginalKB / 1024, 1)))
Write-Host ("  Compressed:   {0} MB" -f ([math]::Round($TotalCompressedKB / 1024, 1)))
Write-Host ("  Saved:        {0} MB ({1}% reduction)" -f $savedMB, $totalReduction) -ForegroundColor Green
Write-Host ""
Write-Host "  Output folder:" -ForegroundColor Cyan
Write-Host "  $OutputFolder"
Write-Host ""

Read-Host "Press Enter to exit"
