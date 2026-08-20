# One-off asset prep: center-crop + downscale + JPEG-compress the source
# bust portraits into assets/portraits/, renamed sequentially since the
# source filenames are meaningless capture timestamps. Zero external deps —
# uses System.Drawing, matching this project's no-npm-image-library stance.
# Re-run manually if more source images are dropped into "Profile Busts".

Add-Type -AssemblyName System.Drawing

$srcDir = "C:\Users\dlive\OneDrive\Desktop\Projects\DnD\Profile Busts"
$destDir = "C:\Users\dlive\OneDrive\Desktop\Projects\DnD\assets\portraits"
$targetSize = 480
$quality = 82

if (-not (Test-Path $destDir)) { New-Item -ItemType Directory -Force -Path $destDir | Out-Null }

$jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$encParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
$encParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [int64]$quality)

$files = Get-ChildItem -Path $srcDir -Filter *.png | Sort-Object Name
$i = 0
foreach ($f in $files) {
    $i++
    $num = "{0:D2}" -f $i
    $outPath = Join-Path $destDir "bust-$num.jpg"

    $src = [System.Drawing.Image]::FromFile($f.FullName)
    $side = [Math]::Min($src.Width, $src.Height)
    $cropX = [int](($src.Width - $side) / 2)
    $cropY = [int](($src.Height - $side) / 2)

    $square = New-Object System.Drawing.Bitmap($side, $side)
    $g1 = [System.Drawing.Graphics]::FromImage($square)
    $g1.DrawImage($src, (New-Object System.Drawing.Rectangle(0, 0, $side, $side)), (New-Object System.Drawing.Rectangle($cropX, $cropY, $side, $side)), [System.Drawing.GraphicsUnit]::Pixel)
    $g1.Dispose()
    $src.Dispose()

    $thumb = New-Object System.Drawing.Bitmap($targetSize, $targetSize)
    $g2 = [System.Drawing.Graphics]::FromImage($thumb)
    $g2.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g2.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g2.DrawImage($square, 0, 0, $targetSize, $targetSize)
    $g2.Dispose()
    $square.Dispose()

    $thumb.Save($outPath, $jpegCodec, $encParams)
    $thumb.Dispose()

    Write-Output "$($f.Name) -> bust-$num.jpg"
}

Write-Output "Done: $i portraits written to $destDir"
