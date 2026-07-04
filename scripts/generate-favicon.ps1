Add-Type -AssemblyName System.Drawing

$src = Join-Path $PSScriptRoot "..\assets\fav.jpg"
$dest = Join-Path $PSScriptRoot "..\images"
$root = Join-Path $PSScriptRoot ".."
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
Save-Size -Size 48 -Path (Join-Path $dest "favicon-48x48.png") -Format ([System.Drawing.Imaging.ImageFormat]::Png)
Save-Size -Size 96 -Path (Join-Path $dest "favicon-96x96.png") -Format ([System.Drawing.Imaging.ImageFormat]::Png)
Save-Size -Size 180 -Path (Join-Path $dest "apple-touch-icon.png") -Format ([System.Drawing.Imaging.ImageFormat]::Png)

$bmp48 = New-Object System.Drawing.Bitmap 48, 48
$g48 = [System.Drawing.Graphics]::FromImage($bmp48)
$g48.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g48.DrawImage($img, 0, 0, 48, 48)
$icon = [System.Drawing.Icon]::FromHandle($bmp48.GetHicon())
$icoPath = Join-Path $dest "favicon.ico"
$fs = New-Object System.IO.FileStream $icoPath, ([System.IO.FileMode]::Create)
$icon.Save($fs)
$fs.Close()
Copy-Item -Path $icoPath -Destination (Join-Path $root "favicon.ico") -Force

$img.Dispose()
$g48.Dispose()
$bmp48.Dispose()
$icon.Dispose()

Write-Output "Created favicon assets in $dest and favicon.ico at site root"
