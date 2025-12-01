@echo off
echo ========================================
echo GitHub Repository Setup
echo ========================================
echo.
echo STEP 1: Create a new repository on GitHub
echo   1. Go to https://github.com/new
echo   2. Repository name: v1-news-ai (or your preferred name)
echo   3. Choose Public or Private
echo   4. DO NOT initialize with README, .gitignore, or license
echo   5. Click "Create repository"
echo.
echo STEP 2: Copy the repository URL (HTTPS or SSH)
echo   Example: https://github.com/yourusername/v1-news-ai.git
echo.
echo ========================================
echo.
set /p REPO_URL="Enter your GitHub repository URL: "
if "%REPO_URL%"=="" (
    echo Error: Repository URL is required
    pause
    exit /b 1
)

echo.
echo Setting up remote origin...
git remote remove origin 2>nul
git remote add origin %REPO_URL%

echo.
echo Pushing to GitHub...
git branch -M main
git push -u origin main

echo.
echo ========================================
echo Done! Your code has been pushed to GitHub.
echo ========================================
pause

