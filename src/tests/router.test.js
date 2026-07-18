// src/tests/router.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReynaHubRouter } from '../core/router.js';

describe('ReynaHubRouter', () => {
  let router;

  beforeEach(() => {
    window.location.hash = '';
    router = new ReynaHubRouter();
  });

  it('should create instance', () => {
    expect(router).toBeDefined();
  });

  it('should have getToolPath method', () => {
    expect(typeof router.getToolPath).toBe('function');
  });

  it('should return correct path for productive planner', () => {
    expect(router.getToolPath('#productive/planner')).toBe('Productive/Task/taskschedule.html');
  });

  it('should return correct path for productive analytic', () => {
    expect(router.getToolPath('#productive/analytic')).toBe('Productive/Analytic.html');
  });

  it('should return correct path for utilities merger', () => {
    expect(router.getToolPath('#utilities/merger')).toBe('Productive/PDF-Merger/PDFM_V2.html');
  });

  it('should return empty string for unknown hash', () => {
    expect(router.getToolPath('#unknown/tool')).toBe('');
  });
});
