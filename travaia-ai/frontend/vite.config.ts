import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// ESM compatibility fix
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig(({ mode }) => {
  // Load environment variables from parent directory (monorepo root) and current directory
  const rootEnv = loadEnv(mode, '..', '');
  const localEnv = loadEnv(mode, '.', '');
  
  // Combine environment variables, with local overriding root
  const env = { ...rootEnv, ...localEnv };
  
  // Use GEMINI_API_KEY as fallback if VITE_GEMINI_API_KEY is not available
  const geminiApiKey = env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY;
  
  return {
    plugins: [react()],
    define: {
      // Define both process.env and import.meta.env versions for compatibility
      'process.env.API_KEY': JSON.stringify(geminiApiKey),
      'process.env.GEMINI_API_KEY': JSON.stringify(geminiApiKey),
      'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(geminiApiKey),
      // API Gateway URL - Primary endpoint for all backend services
      'import.meta.env.VITE_API_GATEWAY_URL': JSON.stringify(env.VITE_API_GATEWAY_URL),
      // TRAVAIA Backend Microservices URLs
      'import.meta.env.VITE_AI_ENGINE_SERVICE_URL': JSON.stringify(env.VITE_AI_ENGINE_SERVICE_URL),
      'import.meta.env.VITE_APPLICATION_JOB_SERVICE_URL': JSON.stringify(env.VITE_APPLICATION_JOB_SERVICE_URL),
      'import.meta.env.VITE_DOCUMENT_REPORT_SERVICE_URL': JSON.stringify(env.VITE_DOCUMENT_REPORT_SERVICE_URL),
      'import.meta.env.VITE_ANALYTICS_GROWTH_SERVICE_URL': JSON.stringify(env.VITE_ANALYTICS_GROWTH_SERVICE_URL),
      'import.meta.env.VITE_INTERVIEW_SESSION_SERVICE_URL': JSON.stringify(env.VITE_INTERVIEW_SESSION_SERVICE_URL),
      // Legacy URLs for backward compatibility
      'import.meta.env.VITE_AUTH_SERVICE_URL': JSON.stringify(env.VITE_AUTH_SERVICE_URL),
      'import.meta.env.VITE_INTERVIEW_BOT_SERVICE_URL': JSON.stringify(env.VITE_INTERVIEW_BOT_SERVICE_URL),
      'import.meta.env.VITE_BACKEND_URL': JSON.stringify(env.VITE_BACKEND_URL),
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, '.'),
      },
    },
    server: {
      proxy: {
        '/api': {
          target: env.VITE_API_GATEWAY_URL,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''), // Remove /api prefix for gateway
          secure: false,
          configure: (proxy, options) => {
            proxy.on('proxyReq', (proxyReq, req, res) => {
              // Log proxy requests for debugging
              console.log(`[PROXY] ${req.method} ${req.url} → ${options.target}${proxyReq.path}`);
            });
            proxy.on('proxyRes', (proxyRes, req, res) => {
              // Add CORS headers to response
              proxyRes.headers['Access-Control-Allow-Origin'] = '*';
              proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
              proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
            });
            proxy.on('error', (err, req, res) => {
              console.error(`[PROXY ERROR] ${req.method} ${req.url}:`, err.message);
            });
          },
        },
      },
      // Silence Firebase popup COOP warning in dev
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/tests/setup.ts',
      alias: {
        '@': resolve(__dirname, '.'),
      },
    },
  };
});