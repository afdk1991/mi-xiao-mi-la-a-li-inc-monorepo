$file = 'f:\gexm\wp-content\themes\mixm-laal\page-templates\page-gallery.php'
$content = [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::UTF8)

$bad = [char]0xFFFD
$corruptPattern = "$bad" + "?"

Write-Host "Corrupt pattern length: $($corruptPattern.Length)"
Write-Host "Corrupt pattern chars: $([int]$corruptPattern[0]), $([int]$corruptPattern[1])"

# Test specific pattern
$testPattern = "相册" + $corruptPattern + "</div>"
Write-Host "Test pattern: $testPattern"
Write-Host "Contains test pattern: $($content.Contains($testPattern))"

# Try simpler search
$testPattern2 = "相册" + $bad
Write-Host "Contains '相册' + bad: $($content.Contains($testPattern2))"

# Search for just the bad char
$badCount = 0
$idx = 0
while (($idx = $content.IndexOf($bad, $idx)) -ge 0) {
    $badCount++
    $idx++
}
Write-Host "Total bad chars in file: $badCount"

# Show context of first few bad chars
$idx = 0
$count = 0
while (($idx = $content.IndexOf($bad, $idx)) -ge 0 -and $count -lt 5) {
    $start = [Math]::Max(0, $idx - 20)
    $len = [Math]::Min(50, $content.Length - $start)
    $context = $content.Substring($start, $len)
    Write-Host "Bad char at $idx context: $context"

    # Show bytes around this position
    $bytePos = $content.Substring(0, $idx).Length
    Write-Host "  Char position: $idx"

    $count++
    $idx++
}
