$file = 'f:\gexm\wp-content\themes\mixm-laal\page-templates\page-gallery.php'

# Read raw bytes
$bytes = [System.IO.File]::ReadAllBytes($file)
Write-Host "File size: $($bytes.Length) bytes"
Write-Host "First 20 bytes (hex):"
$bytes[0..19] | ForEach-Object { Write-Host -NoNewline ('{0:X2} ' -f $_) }
Write-Host ""

# Try reading as UTF-8
Write-Host "`n--- Read as UTF-8 (first 200 chars) ---"
$utf8string = [System.Text.Encoding]::UTF8.GetString($bytes)
Write-Host $utf8string.Substring(0, [Math]::Min(200, $utf8string.Length))

# Try reading as GBK
Write-Host "`n--- Read as GBK (first 200 chars) ---"
$gbkEncoding = [System.Text.Encoding]::GetEncoding('GBK')
$gbkString = $gbkEncoding.GetString($bytes)
Write-Host $gbkString.Substring(0, [Math]::Min(200, $gbkString.Length))
