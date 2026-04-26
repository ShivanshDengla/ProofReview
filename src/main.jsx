import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { MiniKit } from '@worldcoin/minikit-js';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { WORLD_APP_ID } from './lib/worldId.js';
import './index.css';

// MiniKit acts as the postMessage bridge inside the World App webview.
//
// IDKit v4 sends the verify command to World App natively, but the RESULT
// comes back via `window.MiniKit.subscribe('miniapp-verify-action', ...)`.
// If MiniKit isn't installed, IDKit's subscriber is never wired up and the
// proof "disappears" after the user approves (the user sees the green
// "verified" screen in World App, but our SPA never receives the proof).
//
// `MiniKit.install()` is a no-op outside World App, so this is safe to call
// in any environment.
if (WORLD_APP_ID) {
  try {
    MiniKit.install(WORLD_APP_ID);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[ProofReview] MiniKit.install failed:', err);
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
