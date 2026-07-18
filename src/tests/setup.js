// src/tests/setup.js
import { vi } from 'vitest';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(() => null),
  setItem: vi.fn(() => {}),
  removeItem: vi.fn(() => {}),
  clear: vi.fn(() => {}),
  length: 0,
  key: vi.fn(() => null)
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }))
});

// Add meta theme-color tag for ThemeManager tests
const meta = document.createElement('meta');
meta.name = 'theme-color';
meta.content = '#FFFFFF';
document.head.appendChild(meta);

// Mock document.querySelector for tool cards
document.querySelector = vi.fn((selector) => {
  if (selector === '.tool-card') return null;
  return document.createElement(selector);
});

document.querySelectorAll = vi.fn(() => []);

// Mock getElementById
const originalGetElementById = document.getElementById.bind(document);
document.getElementById = vi.fn((id) => {
  if (id === 'tools-grid') {
    return { appendChild: vi.fn(), querySelector: vi.fn(() => null), innerHTML: '', className: '' };
  }
  if (id === 'breadcrumb') return { innerHTML: '' };
  if (id === 'theme-toggle') return null;
  if (id === 'global-search-toggle') return null;
  if (id === 'global-search') return { style: { display: 'none' } };
  if (id === 'global-search-input') return null;
  return originalGetElementById(id);
});