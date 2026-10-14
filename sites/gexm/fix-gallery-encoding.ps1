$file = 'f:\gexm\wp-content\themes\mixm-laal\page-templates\page-gallery.php'

# Read the file as raw bytes
$bytes = [System.IO.File]::ReadAllBytes($file)

# The current bytes are UTF-8 representations of GBK-interpreted original UTF-8 text
# To reverse: decode current bytes as UTF-8 to get the GBK-interpreted string,
# then re-encode that string's characters back as GBK bytes to recover the original UTF-8 bytes,
# then decode those original bytes as UTF-8.

# Step 1: Decode current bytes as UTF-8 (this gives us the garbled string)
$garbledString = [System.Text.Encoding]::UTF8.GetString($bytes)

# Step 2: Get the GBK encoding
$gbkEncoding = [System.Text.Encoding]::GetEncoding('GBK')

# Step 3: Convert the garbled string back to bytes using GBK encoding
# This reverses the original misinterpretation
$restoredBytes = $gbkEncoding.GetBytes($garbledString)

# Step 4: Write the restored bytes back to the file
# Check if the first bytes are BOM (EF BB BF) and remove if present
if ($restoredBytes.Length -ge 3 -and $restoredBytes[0] -eq 0xEF -and $restoredBytes[1] -eq 0xBB -and $restoredBytes[2] -eq 0xBF) {
    Write-Host "BOM detected, removing..."
    $restoredBytes = $restoredBytes[3..($restoredBytes.Length - 1)]
}

[System.IO.File]::WriteAllBytes($file, $restoredBytes)
Write-Host "File encoding restored. New size: $($restoredBytes.Length) bytes"

# Verify by reading first few lines
$verifyContent = Get-Content -Path $file -TotalCount 5
Write-Host "--- First 5 lines after restoration ---"
$verifyContent | ForEach-Object { Write-Host $_ }
