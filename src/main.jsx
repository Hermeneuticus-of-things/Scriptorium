import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { createMockApi } from './lib/mockApi.js';
import { createWebApi } from './lib/webApi.js';
import { installErrorCapture } from './lib/reportProblem.js';
import './styles.css';
import './script.css';
import './behaviour.css';
import './panels-extra.css';
import './editor-extra.css';
import './editing-options.css';
import './help/help.css';
import './ai.css';
import './scrivener-theme.css';

// Electron: window.api from the preload. Browser: IndexedDB-backed web/PWA build,
// or the in-memory demo with ?demo (also used when IndexedDB is unavailable).
function pickApi() {
  if (window.api) return window.api;
  const demo = new URLSearchParams(window.location.search).has('demo');
  if (!demo && window.indexedDB) {
    try {
      return createWebApi();
    } catch {
      /* fall back to the demo */
    }
  }
  return createMockApi();
}

function setupPwa() {
  const link = document.createElement('link');
  link.rel = 'manifest';
  link.href = './manifest.webmanifest';
  document.head.appendChild(link);
  const theme = document.createElement('meta');
  theme.name = 'theme-color';
  theme.content = '#2f3b52';
  document.head.appendChild(theme);
  // Only for the built web app over http(s); never in Electron or the vite dev server.
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && !import.meta.env.DEV) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
  }
}

const api = pickApi();
installErrorCapture(window, api);
if (api.isWeb) setupPwa();
createRoot(document.getElementById('root')).render(
  <ErrorBoundary api={api}>
    <App api={api} />
  </ErrorBoundary>,
);
