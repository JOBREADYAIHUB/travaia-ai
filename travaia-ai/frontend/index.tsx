import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './i18n'; // Import the i18n configuration

// Suppress repetitive development console errors
if (import.meta.env.DEV) {
  const originalError = console.error;
  const originalWarn = console.warn;
  
  console.error = (...args) => {
    const message = String(args[0] || '');
    // Suppress CORS and WebSocket connection errors in development
    if (
      message.includes('Access to fetch at') ||
      message.includes('CORS policy') ||
      message.includes('WebSocket connection to') ||
      message.includes('ERR_CONNECTION_REFUSED') ||
      message.includes('careergpt-coach-service') ||
      message.includes('net::ERR_FAILED')
    ) {
      return; // Suppress these specific errors
    }
    originalError.apply(console, args);
  };
  
  console.warn = (...args) => {
    const message = String(args[0] || '');
    if (
      message.includes('CORS policy') ||
      message.includes('careergpt-coach-service')
    ) {
      return; // Suppress these specific warnings
    }
    originalWarn.apply(console, args);
  };
}

// Import CSS files - direct Tailwind imports
import './styles/tailwind.css'; // Tailwind directives
import './styles/toddler-themes.css'; // Import toddler themes
import './styles/toddler-glassmorphism.css'; // Import glassmorphism styles
import './styles/global.css'; // Global styles for layout
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { LocalizationProvider } from './contexts/LocalizationContext';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <LocalizationProvider>
            <App />
          </LocalizationProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
