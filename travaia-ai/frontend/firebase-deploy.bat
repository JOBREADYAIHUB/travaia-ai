@echo off
echo Building React application with toddler-themed glassmorphism UI components...
call npm run build

echo Creating health check file...
if not exist "dist\health.html" (
  copy public\health.html dist\health.html
)

echo Checking toddler theme CSS files...
if exist "public\toddler-themes.css" (
  if not exist "dist\toddler-themes.css" (
    echo Copying toddler theme CSS files...
    copy public\toddler-themes.css dist\
  )
)

if exist "public\toddler-glassmorphism.css" (
  if not exist "dist\toddler-glassmorphism.css" (
    echo Copying toddler glassmorphism CSS files...
    copy public\toddler-glassmorphism.css dist\
  )
)

echo Deploying to Firebase Hosting...
call firebase deploy --only hosting

echo Deployment complete!
