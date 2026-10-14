$file = 'f:\gexm\wp-content\themes\mixm-laal\page-templates\page-gallery.php'
$bytes = [System.IO.File]::ReadAllBytes($file)
$utf8 = [System.Text.Encoding]::UTF8
$decoder = $utf8.GetDecoder()
$charCount = $decoder.GetCharCount($bytes, 0, $bytes.Length)
$chars = New-Object 'char[]' $charCount
$decoder.GetChars($bytes, 0, $bytes.Length, $chars, 0)

# Find all replacement characters and show context
$errors = @()
for ($i = 0; $i -lt $chars.Length; $i++) {
    if ([int]$chars[$i] -eq 0xFFFD) {
        $start = [Math]::Max(0, $i - 15)
        $end = [Math]::Min($chars.Length - 1, $i + 15)
        $context = -join $chars[$start..$end]
        # Find line number
        $lineNum = 1
        for ($j = 0; $j -lt $i; $j++) {
            if ($chars[$j] -eq "`n") { $lineNum++ }
        }
        $errors += [PSCustomObject]@{
            Line = $lineNum
            Context = $context
        }
    }
}

Write-Host "Total errors: $($errors.Count)"
$errors | ForEach-Object {
    Write-Host "Line $($_.Line): $($_.Context)"
}
