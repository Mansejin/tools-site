import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { GameSettingsProvider } from './settings/GameSettingsContext.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GameSettingsProvider>
      <App />
    </GameSettingsProvider>
  </StrictMode>,
);

// Drop PWA SW — GH Pages + CDN caching kept users stuck on old builds.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((r) => r.unregister());
  });
}
if (typeof caches !== 'undefined') {
  caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
}
