import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { exchangeNonceIfPresent } from './auth.js'

const VITE_BACKEND_URL = import.meta.env.VITE_BACKEND_URL

// Handle nonce exchange if present in URL
const queryParams = new URLSearchParams(window.location.search);
const nonce = queryParams.get('nonce');

async function getTokens() {
  const root = document.getElementById('root');
  if (!root) {
    console.error('Root element not found');
    return;
  }

  if (nonce === null) {
    // No nonce, render app normally
    createRoot(root).render(
      <StrictMode>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </StrictMode>
    );
    return;
  }

  // Exchange nonce for tokens
  try {
    const success = await exchangeNonceIfPresent();
    
    // Always render the app - exchangeNonceIfPresent already cleaned up the URL
    // If successful, user is authenticated and will see the feed
    // If failed, ProtectedRoute will redirect to login
    createRoot(root).render(
      <StrictMode>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </StrictMode>
    );
    
    // If login was successful, the URL is already cleaned (nonce removed)
    // The app will render and ProtectedRoute will allow access to /
  } catch (error) {
    // If nonce exchange fails, still render the app so user can see error/login
    console.error('Error during nonce exchange:', error);
    createRoot(root).render(
      <StrictMode>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </StrictMode>
    );
  }
}

getTokens();

