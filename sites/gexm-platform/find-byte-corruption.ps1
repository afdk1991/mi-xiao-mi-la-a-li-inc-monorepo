$file = 'f:\gexm\wp-content\themes\mixm-laal\page-templates\page-gallery.php'

# Read as raw bytes
$bytes = [System.IO.File]::ReadAllBytes($file)
Write-Host "File size: $($bytes.Length) bytes"

# The corruption pattern in UTF-8 bytes is: EF BF BD 3F (U+FFFD + ?)
# We need to find these 4-byte sequences and replace them based on context

# First, let's find all occurrences and their context
$corruptionBytes = @(0xEF, 0xBF, 0xBD, 0x3F)
$positions = @()
for ($i = 0; $i -lt $bytes.Length - 4; $i++) {
    if ($bytes[$i] -eq 0xEF -and $bytes[$i+1] -eq 0xBF -and $bytes[$i+2] -eq 0xBD -and $bytes[$i+3] -eq 0x3F) {
        $positions += $i
    }
}
Write-Host "Found $($positions.Count) corruption occurrences"

# Show context for each (decode surrounding bytes as UTF-8)
foreach ($pos in $positions) {
    $start = [Math]::Max(0, $pos - 30)
    $end = [Math]::Min($bytes.Length - 1, $pos + 30)
    $contextBytes = $bytes[$start..$end]
    $context = [System.Text.Encoding]::UTF8.GetString($contextBytes)
    Write-Host "At byte $pos : $context"
}
