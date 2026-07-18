// src/tests/theme-manager.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ThemeManager } from '../core/theme-manager.js';

describe('ThemeManager', () => {
  let themeManager;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.setAttribute('data-theme', 'light');
    document.documentElement.classList.remove('theme-light', 'theme-dark');
    themeManager = new ThemeManager();
    themeManager.updateInProgress = false;
  });

  it('should initialize with system theme by default', () => {
    expect(themeManager.currentTheme).toBe('system');
  });

  it('should toggle from system to light or dark', () => {
    const before = themeManager.currentTheme;
    themeManager.toggle();
    expect(themeManager.currentTheme).not.toBe(before);
  });

  it('should set valid theme', () => {
    themeManager.setTheme('dark');
    expect(themeManager.currentTheme).toBe('dark');
  });

  it('should ignore invalid theme', () => {
    themeManager.setTheme('invalid');
    expect(themeManager.currentTheme).toBe('system');
  });

  it('should get current theme', () => {
    themeManager.setTheme('light');
    expect(themeManager.getTheme()).toBe('light');
  });

  it('should apply theme to document element', () => {
    themeManager.setTheme('dark');
    themeManager.applyTheme();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(document.documentElement.classList.contains('theme-dark')).toBe(true);
  });

  it('should apply light theme class', () => {
    themeManager.setTheme('light');
    themeManager.applyTheme();
    expect(document.documentElement.classList.contains('theme-light')).toBe(true);
  });
});