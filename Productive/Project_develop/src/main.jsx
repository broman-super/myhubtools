import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { ThemeProvider } from './components/theme-provider.tsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <ThemeProvider storageKey="rnd-theme">
    <App />
  </ThemeProvider>
);