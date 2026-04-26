import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { ensureMiniKitInstalled } from './lib/worldId.js';
import './index.css';

// Initialize MiniKit ASAP. This is a no-op outside World App, but when the
// mini app is launched inside World App it primes the bridge so MiniKit
// commands (like verify) are usable immediately.
ensureMiniKitInstalled();

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
