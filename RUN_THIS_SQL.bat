@echo off
echo ================================================================
echo   SUPABASE SQL DEPLOYMENT HELPER
echo ================================================================
echo.
echo This script will:
echo 1. Copy the SQL to your clipboard
echo 2. Open Supabase SQL Editor in your browser
echo.
echo Then you just need to:
echo - Press Ctrl+V to paste
echo - Click RUN (or press Ctrl+Enter)
echo.
pause
echo.
echo Copying SQL to clipboard...
type "src\SQL Queries\Enhanced_Sales_Orders.sql" | clip
echo ✅ SQL copied to clipboard!
echo.
echo Opening Supabase SQL Editor...
start https://supabase.com/dashboard/project/kaczhcjgicswvgfxvmgx/sql/new
echo.
echo ================================================================
echo   NEXT STEPS:
echo ================================================================
echo.
echo 1. Supabase SQL Editor should open in your browser
echo 2. Press Ctrl+V to paste the SQL
echo 3. Click the green RUN button (or press Ctrl+Enter)
echo 4. Wait for success messages
echo.
echo ✅ That's it! Your database will be updated.
echo.
pause
