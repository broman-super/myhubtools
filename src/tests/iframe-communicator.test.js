// src/tests/iframe-communicator.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IframeCommunicator } from '../core/iframe-communicator.js';

describe('IframeCommunicator', () => {
  let communicator;

  beforeEach(() => {
    communicator = new IframeCommunicator();
  });

  it('should initialize with empty listeners', () => {
    expect(communicator.listeners.size).toBe(0);
  });

  it('should register message listener via addMessageListener', () => {
    const callback = vi.fn();
    const unsubscribe = communicator.addMessageListener('test', callback);
    expect(communicator.listeners.has('test')).toBe(true);
    expect(typeof unsubscribe).toBe('function');
  });

  it('should unsubscribe listener', () => {
    const callback = vi.fn();
    const unsubscribe = communicator.addMessageListener('test', callback);
    unsubscribe();
    const listeners = communicator.listeners.get('test');
    expect(listeners).not.toContain(callback);
  });

  it('should handle incoming messages with valid source', () => {
    const callback = vi.fn();
    communicator.addMessageListener('init', callback);
    
    communicator.handleMessage({
      data: { type: 'init', data: { tool: 'latch' }, source: 'reynahub-child' },
      origin: window.location.origin
    });
    
    expect(callback).toHaveBeenCalledWith({ tool: 'latch' }, 'reynahub-child', window.location.origin);
  });

  it('should ignore messages with invalid source', () => {
    const callback = vi.fn();
    communicator.addMessageListener('init', callback);
    
    communicator.handleMessage({
      data: { type: 'init', data: {}, source: 'unknown' },
      origin: window.location.origin
    });
    
    expect(callback).not.toHaveBeenCalled();
  });
});