Add-Type -AssemblyName System.Drawing

$src = Join-Path $PSScriptRoot "..\assets\fav.jpg"
$dest = Join-Path $PSScriptRoot "..\images"
New-Item -ItemType Directory -Force -Path $dest | Out-Null

$img = [System.Drawing.Image]::FromFile($src)

function Save-Size {
  param([int]$Size, [string]$Path, [System.Drawing.Imaging.ImageFormat]$Format)
  $bmp = New-Object System.Drawing.Bitmap $Size, $Size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.DrawImage($img, 0, 0, $Size, $Size)
  $bmp.Save($Path, $Format)
  $g.Dispose()
  $bmp.Dispose()
}

Save-Size -Size 32 -Path (Join-Path $dest "favicon-32x32.png") -Format ([System.Drawing.Imaging.ImageFormat]::Png)
Save-Size -Size 180 -Path (Join-Path $dest "apple-touch-icon.png") -Format ([System.Drawing.Imaging.ImageFormat]::Png)

$bmp32 = New-Object System.Drawing.Bitmap 32, 32
$g32 = [System.Drawing.Graphics]::FromImage($bmp32)
$g32.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g32.DrawImage($img, 0, 0, 32, 32)
$icon = [System.Drawing.Icon]::FromHandle($bmp32.GetHicon())
$icoPath = Join-Path $dest "favicon.ico"
$fs = New-Object System.IO.FileStream $icoPath, ([System.IO.FileMode]::Create)
$icon.Save($fs)
$fs.Close()

$img.Dispose()
$g32.Dispose()
$bmp32.Dispose()
$icon.Dispose()

Write-Output "Created favicon assets in $dest"
