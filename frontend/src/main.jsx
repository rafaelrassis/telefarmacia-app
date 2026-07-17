import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './lib/installPrompt.js';
import App from './App.jsx';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './context/AuthContext.jsx';
import AppErrorBoundary from './components/AppErrorBoundary.jsx';
import { initSentry } from './monitoring/sentry';
import './index.css';

initSentry();

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'ausente';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <BrowserRouter>
        <GoogleOAuthProvider clientId={clientId}>
          <AuthProvider>
            <App />
          </AuthProvider>
        </GoogleOAuthProvider>
      </BrowserRouter>
    </AppErrorBoundary>
  </React.StrictMode>
);
