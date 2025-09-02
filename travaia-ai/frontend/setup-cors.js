import { Storage } from '@google-cloud/storage';

// Initialize Google Cloud Storage
const storage = new Storage({
  projectId: 'travaia-e1310',
});

const bucketName = 'travaia-e1310.firebasestorage.app';

async function setupCORS() {
  try {
    const corsConfiguration = [
      {
        maxAgeSeconds: 3600,
        method: ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS'],
        origin: [
          'http://localhost:3000',
          'http://localhost:5173',
          'http://localhost:5174',
          'http://localhost:5175',
          'http://127.0.0.1:3000',
          'http://127.0.0.1:5173',
          'http://127.0.0.1:5174',
          'http://127.0.0.1:5175',
          'https://travaia-e1310.web.app',
          'https://travaia-e1310.firebaseapp.com'
        ],
        responseHeader: [
          'Content-Type',
          'Authorization',
          'Content-Length',
          'User-Agent',
          'X-Requested-With'
        ],
      },
    ];

    await storage.bucket(bucketName).setCorsConfiguration(corsConfiguration);
    
    console.log(`✅ CORS configuration applied successfully to bucket: ${bucketName}`);
    console.log('📝 Configuration:', JSON.stringify(corsConfiguration, null, 2));
    
    // Verify the configuration
    const [metadata] = await storage.bucket(bucketName).getMetadata();
    console.log('🔍 Current CORS config:', metadata.cors);
    
  } catch (error) {
    console.error('❌ Error setting up CORS:', error);
  }
}

setupCORS();
