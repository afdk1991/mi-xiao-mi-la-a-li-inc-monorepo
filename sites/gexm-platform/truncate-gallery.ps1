$file = 'f:\gexm\wp-content\themes\mixm-laal\page-templates\page-gallery.php'
$lines = Get-Content -Path $file
Write-Host "Original line count: $($lines.Count)"
$newContent = $lines[0..1661]
Set-Content -Path $file -Value $newContent -Encoding UTF8
Write-Host "Truncated to $($newContent.Count) lines"
