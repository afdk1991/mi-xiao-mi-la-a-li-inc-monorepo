$file = 'f:\gexm\wp-content\themes\mixm-laal\page-templates\page-gallery.php'
$bytes = [System.IO.File]::ReadAllBytes($file)
$utf8 = [System.Text.Encoding]::UTF8
$errorCount = 0
$errorPositions = @()

# Try to decode and find invalid sequences
try {
    $decoder = $utf8.GetDecoder()
    $charCount = $decoder.GetCharCount($bytes, 0, $bytes.Length)
    $chars = New-Object 'char[]' $charCount
    $decoder.GetChars($bytes, 0, $bytes.Length, $chars, 0)

    # Check for replacement characters
    for ($i = 0; $i -lt $chars.Length; $i++) {
        if ([int]$chars[$i] -eq 0xFFFD) {
            $errorCount++
            if ($errorCount -le 20) {
                $errorPositions += $i
            }
        }
    }

    Write-Host "Total replacement characters (corrupted): $errorCount"
    Write-Host "First 20 positions: $($errorPositions -join ', ')"

    # Show context around first few errors
    foreach ($pos in $errorPositions[0..4]) {
        $start = [Math]::Max(0, $pos - 10)
        $end = [Math]::Min($chars.Length - 1, $pos + 10)
        $context = -join $chars[$start..$end]
        Write-Host "Position $pos context: $context"
    }
} catch {
    Write-Host "Error decoding: $_"
}
