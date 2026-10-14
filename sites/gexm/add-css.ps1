$cssPath = "f:\gexm\wp-content\themes\mixm-laal\assets\css\zibll-ui.css"

$p = @"

/* 77. 修复网格宽度和卡片布局 */
.post-list-grid {
  width: 100% !important;
  max-width: 100% !important;
  min-width: 100% !important;
  display: grid !important;
  grid-template-columns: repeat(2, minmax(300px, 1fr)) !important;
  gap: 20px !important;
}

/* 78. 文章卡片完整布局 */
.post-card {
  display: flex !important;
  flex-direction: row !important;
  align-items: stretch !important;
  min-height: 180px !important;
  width: 100% !important;
  box-sizing: border-box !important;
}
.post-card .img-box {
  flex-shrink: 0 !important;
  width: 35% !important;
  min-width: 120px !important;
  max-width: 160px !important;
  position: relative !important;
}
.post-card .post-card-body {
  flex: 1 !important;
  display: flex !important;
  flex-direction: column !important;
  padding: 16px !important;
  min-width: 0 !important;
  width: auto !important;
}

/* 79. 卡片内容自适应 */
.post-card-title {
  flex-shrink: 0 !important;
}
.post-card-excerpt {
  flex: 1 !important;
  overflow: hidden !important;
}
.post-card-meta {
  flex-shrink: 0 !important;
}
"@

Add-Content -Path $cssPath -Value $p -Encoding UTF8
Write-Host "Added 77-79"
