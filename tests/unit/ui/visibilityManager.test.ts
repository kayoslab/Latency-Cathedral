// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('US-015: visibilityManager', () => {
  let createVisibilityManager: typeof import('../../../src/ui/visibilityManager').createVisibilityManager;

  beforeEach(async () => {
    vi.resetModules();
    ({ createVisibilityManager } = await import('../../../src/ui/visibilityManager'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function fireVisibilityChange(hidden: boolean) {
    Object.defineProperty(document, 'hidden', {
      value: hidden,
      writable: true,
      configurable: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));
  }

  it('onHidden callback fires when document.hidden becomes true', () => {
    const manager = createVisibilityManager();
    const cb = vi.fn();

    manager.onHidden(cb);
    fireVisibilityChange(true);

    expect(cb).toHaveBeenCalledTimes(1);
    manager.dispose();
  });

  it('onVisible callback fires when tab returns (document.hidden becomes false)', () => {
    const manager = createVisibilityManager();
    const cb = vi.fn();

    manager.onVisible(cb);
    fireVisibilityChange(false);

    expect(cb).toHaveBeenCalledTimes(1);
    manager.dispose();
  });

  it('onHidden does not fire when document.hidden is false', () => {
    const manager = createVisibilityManager();
    const cb = vi.fn();

    manager.onHidden(cb);
    fireVisibilityChange(false);

    expect(cb).not.toHaveBeenCalled();
    manager.dispose();
  });

  it('onVisible does not fire when document.hidden is true', () => {
    const manager = createVisibilityManager();
    const cb = vi.fn();

    manager.onVisible(cb);
    fireVisibilityChange(true);

    expect(cb).not.toHaveBeenCalled();
    manager.dispose();
  });

  it('supports multiple onHidden subscribers', () => {
    const manager = createVisibilityManager();
    const cb1 = vi.fn();
    const cb2 = vi.fn();

    manager.onHidden(cb1);
    manager.onHidden(cb2);
    fireVisibilityChange(true);

    expect(cb1).toHaveBeenCalledTimes(1);
    expect(cb2).toHaveBeenCalledTimes(1);
    manager.dispose();
  });

  it('supports multiple onVisible subscribers', () => {
    const manager = createVisibilityManager();
    const cb1 = vi.fn();
    const cb2 = vi.fn();

    manager.onVisible(cb1);
    manager.onVisible(cb2);
    fireVisibilityChange(false);

    expect(cb1).toHaveBeenCalledTimes(1);
    expect(cb2).toHaveBeenCalledTimes(1);
    manager.dispose();
  });

  it('dispose() removes the visibilitychange listener', () => {
    const removeSpy = vi.spyOn(document, 'removeEventListener');
    const manager = createVisibilityManager();

    manager.dispose();

    const removed = removeSpy.mock.calls.some(
      ([event]) => event === 'visibilitychange',
    );
    expect(removed).toBe(true);
    removeSpy.mockRestore();
  });

  it('callbacks do not fire after dispose()', () => {
    const manager = createVisibilityManager();
    const hiddenCb = vi.fn();
    const visibleCb = vi.fn();

    manager.onHidden(hiddenCb);
    manager.onVisible(visibleCb);
    manager.dispose();

    fireVisibilityChange(true);
    fireVisibilityChange(false);

    expect(hiddenCb).not.toHaveBeenCalled();
    expect(visibleCb).not.toHaveBeenCalled();
  });

  it('unsubscribe function prevents further callbacks', () => {
    const manager = createVisibilityManager();
    const cb = vi.fn();

    const unsub = manager.onHidden(cb);
    unsub();

    fireVisibilityChange(true);

    expect(cb).not.toHaveBeenCalled();
    manager.dispose();
  });

  it('no duplicate callbacks after unsubscribe and re-subscribe', () => {
    const manager = createVisibilityManager();
    const cb = vi.fn();

    const unsub = manager.onHidden(cb);
    unsub();

    // Re-subscribe
    manager.onHidden(cb);
    fireVisibilityChange(true);

    expect(cb).toHaveBeenCalledTimes(1);
    manager.dispose();
  });
});
