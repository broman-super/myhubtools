// src/core/theme-manager.js - Unified theme management (non-module)
class ThemeManager {
  constructor() {
    this.currentTheme = localStorage.getItem('reynahub-theme') || 'system';
    this.updateInProgress = false;
    this.init();
  }

  init() {
    this.applyTheme();
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (this.currentTheme === 'system') this.applyTheme();
    });
  }

  applyTheme() {
    if (this.updateInProgress) return;
    this.updateInProgress = true;
    var root = document.documentElement;
    root.classList.remove('theme-light', 'theme-dark');
    var useDark = this.getEffectiveTheme();
    root.setAttribute('data-theme', useDark ? 'dark' : 'light');
    root.classList.add(useDark ? 'theme-dark' : 'theme-light');
    this.updateMetaThemeColor(useDark);
    localStorage.setItem('reynahub-theme', this.currentTheme);
    window.dispatchEvent(new CustomEvent('theme-changed', { detail: { theme: this.currentTheme, isDark: useDark } }));
    requestAnimationFrame(() => { this.updateInProgress = false; });
  }

  getEffectiveTheme() {
    if (this.currentTheme === 'light') return false;
    if (this.currentTheme === 'dark') return true;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  updateMetaThemeColor(isDark) {
    var meta = null;
    var metas = document.querySelectorAll('meta');
    for (var i = 0; i < metas.length; i++) {
      if (metas[i].name === 'theme-color') { meta = metas[i]; break; }
    }
    if (!meta) { meta = document.createElement('meta'); meta.name = 'theme-color'; document.head.appendChild(meta); }
    meta.content = isDark ? '#0F172A' : '#FFFFFF';
  }

  toggle() {
    if (this.currentTheme === 'system') {
      this.currentTheme = localStorage.getItem('reynahub-theme') === 'light' ? 'dark' : 'light';
    } else {
      this.currentTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    }
    this.applyTheme();
  }

  setTheme(theme) {
    if (['light', 'dark', 'system'].indexOf(theme) !== -1) {
      this.currentTheme = theme;
      this.applyTheme();
    }
  }

  getTheme() { return this.currentTheme; }
}

if (typeof module !== 'undefined') module.exports = { ThemeManager };
