const express = require('express');
const path = require('path');
const fs = require('fs');

// Print environment for debugging
console.log('Starting server with environment:', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  PWD: process.env.PWD,
  DIRECTORY_CONTENTS: fs.readdirSync('.'),
});

const app = express();

// Get the PORT from environment variable or default to 8080
const PORT = process.env.PORT || 8080;

// Explicitly check all possible build directories
console.log('Checking for build directories...');
const distExists = fs.existsSync(path.join(__dirname, 'dist'));
const buildExists = fs.existsSync(path.join(__dirname, 'build'));
const publicExists = fs.existsSync(path.join(__dirname, 'public'));

console.log({
  distExists,
  distContents: distExists ? fs.readdirSync(path.join(__dirname, 'dist')) : [],
  buildExists,
  buildContents: buildExists
    ? fs.readdirSync(path.join(__dirname, 'build'))
    : [],
  publicExists,
  publicContents: publicExists
    ? fs.readdirSync(path.join(__dirname, 'public'))
    : [],
});

// Choose the appropriate static directory
let staticDir = 'dist'; // Default to 'dist'

if (distExists && fs.existsSync(path.join(__dirname, 'dist', 'index.html'))) {
  staticDir = 'dist';
  console.log('Using "dist" directory for static files');
} else if (
  buildExists &&
  fs.existsSync(path.join(__dirname, 'build', 'index.html'))
) {
  staticDir = 'build';
  console.log('Using "build" directory for static files');
} else if (
  publicExists &&
  fs.existsSync(path.join(__dirname, 'public', 'index.html'))
) {
  staticDir = 'public';
  console.log('Using "public" directory for static files');
} else {
  console.error('ERROR: No suitable static directory with index.html found');
  // Still continue and serve the health endpoint
}

// Health check endpoint for Cloud Run - MUST respond on this endpoint
app.get('/health', (req, res) => {
  console.log('Health check request received');
  res.status(200).send('OK');
});

// Attempt to serve static files if the directory exists
if (fs.existsSync(path.join(__dirname, staticDir))) {
  console.log(`Serving static files from ${staticDir} directory`);
  app.use(express.static(path.join(__dirname, staticDir)));

  // Fallback all routes to the index.html if it exists
  if (fs.existsSync(path.join(__dirname, staticDir, 'index.html'))) {
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, staticDir, 'index.html'));
    });
  }
}

// Start the server with error handling
try {
  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Health check available at http://localhost:${PORT}/health`);
  });

  // Handle server errors
  server.on('error', (error) => {
    console.error('Server error:', error);
    process.exit(1); // Exit with error code
  });

  // Handle process termination
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
      console.log('Server closed');
    });
  });
} catch (error) {
  console.error('Failed to start server:', error);
  process.exit(1); // Exit with error code
}
