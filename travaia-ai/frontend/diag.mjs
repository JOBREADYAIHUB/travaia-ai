import { createServer } from 'vite';

async function run() {
  console.log('Attempting to create Vite server programmatically...');
  try {
    const server = await createServer({
      // Your Vite config here, or leave empty for default
      root: '.',
      server: {
        port: 5175, // Use a different port to avoid conflicts
      },
    });

    if (server) {
      console.log('Vite server created successfully. Attempting to listen...');
      await server.listen();
      console.log('Server is listening.');
      server.printUrls();
    } else {
      console.error('Failed to create Vite server object.');
    }
  } catch (e) {
    console.error('Caught an error during Vite server creation or startup:', e);
  }
}

run();
