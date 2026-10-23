$ErrorActionPreference = 'Stop'
$taskRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$documentPath = Join-Path $taskRoot 'output/faculty-guide/FreshRoute-Website-and-Faculty-Guide.docx'
$pdfPath = Join-Path $taskRoot 'output/faculty-guide/FreshRoute-Website-and-Faculty-Guide.pdf'
$wordRenderer = $null
$guideDocument = $null
try {
    $wordRenderer = New-Object -ComObject Word.Application
    $wordRenderer.Visible = $false
    $wordRenderer.DisplayAlerts = 0
    $guideDocument = $wordRenderer.Documents.Open($documentPath, $false, $true)
    # Export all content with heading bookmarks; leave the editable source unchanged.
    $guideDocument.ExportAsFixedFormat($pdfPath, 17, $false, 0, 0, 1, 1, 0, $true, $true, 1)
    Write-Output 'Word and PDF versions are ready for page inspection.'
} finally {
    if ($null -ne $guideDocument) { $guideDocument.Close(0) }
    if ($null -ne $wordRenderer) {
        $wordRenderer.Quit()
        [System.Runtime.InteropServices.Marshal]::ReleaseComObject($wordRenderer) | Out-Null
    }
}
