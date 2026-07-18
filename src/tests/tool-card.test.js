// src/tests/tool-card.test.js
import { describe, it, expect } from 'vitest';
import { ToolCard } from '../components/tool-card.js';

describe('ToolCard', () => {
  it('should have configs array', () => {
    expect(ToolCard.configs).toBeDefined();
    expect(Array.isArray(ToolCard.configs)).toBe(true);
    expect(ToolCard.configs.length).toBeGreaterThanOrEqual(6);
  });

  it('should have required fields in each config', () => {
    ToolCard.configs.forEach(config => {
      expect(config.group).toBeDefined();
      expect(config.hash).toBeDefined();
      expect(config.title).toBeDefined();
      expect(config.desc).toBeDefined();
      expect(config.search).toBeDefined();
    });
  });

  it('should create a card element', () => {
    const card = ToolCard.createCard(ToolCard.configs[0]);
    expect(card).toBeDefined();
    expect(card.classList.contains('bento-card')).toBe(true);
  });

  it('should have correct title in card', () => {
    const card = ToolCard.createCard(ToolCard.configs[0]);
    const title = card.querySelector('h3');
    expect(title.textContent).toBe(ToolCard.configs[0].title);
  });

  it('should have data-search attribute', () => {
    const card = ToolCard.createCard(ToolCard.configs[0]);
    expect(card.getAttribute('data-search')).toBe(ToolCard.configs[0].search);
  });

  it('should have data-hash attribute', () => {
    const card = ToolCard.createCard(ToolCard.configs[0]);
    expect(card.getAttribute('data-hash')).toBe(ToolCard.configs[0].hash);
  });
});
