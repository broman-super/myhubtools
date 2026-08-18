import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';
import '../../../src/styles/design-system.css';
import '../../../src/styles/tools.css';

createRoot(document.getElementById('root')).render(<App />);
