# Supabase SQL Deployment Script
Write-Host "`n" -NoNewline
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  DEPLOYING SQL TO SUPABASE" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# Read SQL file
$sqlPath = Join-Path $PSScriptRoot "src\SQL Queries\Enhanced_Sales_Orders.sql"
$sql = Get-Content $sqlPath -Raw

Write-Host "📄 SQL File: Enhanced_Sales_Orders.sql" -ForegroundColor Green
Write-Host "📊 Size: $($sql.Length) characters" -ForegroundColor Green
Write-Host ""

# Copy to clipboard
$sql | Set-Clipboard
Write-Host "✅ SQL copied to clipboard!" -ForegroundColor Green
Write-Host ""

# Open Supabase SQL Editor
$url = "https://supabase.com/dashboard/project/kaczhcjgicswvgfxvmgx/sql/new"
Write-Host "🌐 Opening Supabase SQL Editor..." -ForegroundColor Yellow
Start-Process $url

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  NEXT STEPS (IN YOUR BROWSER)" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. ✅ SQL Editor is opening in your browser" -ForegroundColor White
Write-Host "2. ✅ SQL is already in your clipboard" -ForegroundColor White
Write-Host "3. 📋 Press Ctrl+V to paste" -ForegroundColor Yellow
Write-Host "4. ▶️  Click RUN button (or press Ctrl+Enter)" -ForegroundColor Yellow
Write-Host "5. ⏳ Wait for success messages" -ForegroundColor Yellow
Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 The SQL will:" -ForegroundColor White
Write-Host "   • Add customer fields (name, address, phone)" -ForegroundColor Gray
Write-Host "   • Add discount tracking" -ForegroundColor Gray
Write-Host "   • Add advance payment calculation" -ForegroundColor Gray  
Write-Host "   • Add order status management" -ForegroundColor Gray
Write-Host "   • Create automatic calculations" -ForegroundColor Gray
Write-Host ""
Write-Host "✨ After running, your Manual Sales Order feature will be ready!" -ForegroundColor Green
Write-Host ""
