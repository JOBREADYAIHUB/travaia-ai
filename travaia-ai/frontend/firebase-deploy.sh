#!/bin/bash
set -e

# Build the React application with toddler themes
echo "Building React application with toddler-themed glassmorphism UI components..."
npm run build

# Ensure the health check file exists
if [ ! -f "dist/health.html" ]; then
  echo "Creating health check file..."
  cp public/health.html dist/health.html
fi

# Ensure CSS files for toddler themes are properly included
if [ ! -f "dist/toddler-themes.css" ] && [ -f "public/toddler-themes.css" ]; then
  echo "Copying toddler theme CSS files..."
  cp public/toddler-themes.css dist/
fi

if [ ! -f "dist/toddler-glassmorphism.css" ] && [ -f "public/toddler-glassmorphism.css" ]; then
  echo "Copying toddler glassmorphism CSS files..."
  cp public/toddler-glassmorphism.css dist/
fi

# Deploy to Firebase Hosting
echo "Deploying to Firebase Hosting..."
firebase deploy --only hosting

echo "Deployment complete!"
