@echo off
echo ========================================
echo Pushing to Task2 Repository
echo ========================================
echo.

echo Adding Task2 remote...
git remote remove task2 2>nul
git remote add task2 git@github.com:blackholeinfiverse83-bit/Task2.git

echo.
echo Staging all changes...
git add .

echo.
echo Committing changes...
git commit -m "Push to Task2 repository"

echo.
echo Pushing to Task2 repository...
git push -u task2 main

echo.
echo ========================================
echo Done! Code has been pushed to Task2.
echo ========================================
pause
