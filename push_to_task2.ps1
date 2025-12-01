# PowerShell script to push to Task2 repository

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Pushing to Task2 Repository" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

try {
    Write-Host "Adding Task2 remote..." -ForegroundColor Yellow
    git remote remove task2 2>$null
    git remote add task2 https://github.com/blackholeinfiverse83-bit/Task2.git
    
    Write-Host ""
    Write-Host "Staging all changes..." -ForegroundColor Yellow
    git add .
    
    Write-Host ""
    Write-Host "Committing changes..." -ForegroundColor Yellow
    git commit -m "Push to Task2 repository"
    
    Write-Host ""
    Write-Host "Pushing to Task2 repository..." -ForegroundColor Yellow
    git push -u task2 main
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "Done! Code has been pushed to Task2." -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
}
catch {
    Write-Host ""
    Write-Host "Error occurred: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "If you're getting SSH authentication errors, try using HTTPS instead:" -ForegroundColor Yellow
    Write-Host "  git remote set-url task2 https://github.com/blackholeinfiverse83-bit/Task2.git" -ForegroundColor White
}

Write-Host ""
Write-Host "Press any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
