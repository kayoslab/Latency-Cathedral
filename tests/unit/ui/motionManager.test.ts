// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('US-015: motionManager', () => {
  let createMotionManager: typeof import('../../../src/ui/motionManager').createMotionManager;

  // We need to track the change listener so we can simulate media query changes
  let changeListeners: Array<(e: { matches: boolean }) => void>;

  function stubMatchMedia(initialMatches: boolean) {
    changeListeners = [];

    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({
      matches: initialMatches,
      addEventListener: vi.fn((_event: string, cb: (e: { matches: boolean }) => void) => {
        changeListeners.push(cb);
      }),
      removeEventListener: vi.fn((_event: string, cb: (e: { matches: boolean }) => void) => {
        changeListeners = changeListeners.filter((l) => l !== cb);
      }),
    }));
  }

  function fireMotionChange(matches: boolean) {
    for (const listener of [...changeListeners]) {
      listener({ matches });
    }
  }

  beforeEach(async () => {
    vi.resetModules();
    stubMatchMedia(false);
    ({ createMotionManager } = await import('../../../src/ui/motionManager'));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('isReduced() returns false when prefers-reduced-motion is not active', () => {
    stubMatchMedia(false);

    const manager = createMotionManager();
    expect(manager.isReduced()).toBe(false);
    manager.dispose();
  });

  it('isReduced() returns true when prefers-reduced-motion is active', async () => {
    vi.resetModules();
    stubMatchMedia(true);

    const mod = await import('../../../src/ui/motionManager');
    const manager = mod.createMotionManager();
    expect(manager.isReduced()).toBe(true);
    manager.dispose();
  });

  it('onChange callback fires when media query changes', () => {
    const manager = createMotionManager();
    const cb = vi.fn();

    manager.onChange(cb);
    fireMotionChange(true);

    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith(true);
    manager.dispose();
  });

  it('onChange callback fires with false when motion preference is removed', () => {
    const manager = createMotionManager();
    const cb = vi.fn();

    manager.onChange(cb);
    fireMotionChange(true);
    fireMotionChange(false);

    expect(cb).toHaveBeenCalledTimes(2);
    expect(cb).toHaveBeenLastCalledWith(false);
    manager.dispose();
  });

  it('isReduced() updates after a change event', () => {
    const manager = createMotionManager();

    expect(manager.isReduced()).toBe(false);

    fireMotionChange(true);
    expect(manager.isReduced()).toBe(true);

    fireMotionChange(false);
    expect(manager.isReduced()).toBe(false);

    manager.dispose();
  });

  it('supports multiple onChange subscribers', () => {
    const manager = createMotionManager();
    const cb1 = vi.fn();
    const cb2 = vi.fn();

    manager.onChange(cb1);
    manager.onChange(cb2);
    fireMotionChange(true);

    expect(cb1).toHaveBeenCalledTimes(1);
    expect(cb2).toHaveBeenCalledTimes(1);
    manager.dispose();
  });

  it('dispose() removes the media query listener', () => {
    const manager = createMotionManager();
    const cb = vi.fn();

    manager.onChange(cb);
    manager.dispose();

    // The removeEventListener on the matchMedia result should have been called
    const mql = (window.matchMedia as ReturnType<typeof vi.fn>).mock.results[0]?.value;
    expect(mql.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('callbacks do not fire after dispose()', () => {
    const manager = createMotionManager();
    const cb = vi.fn();

    manager.onChange(cb);
    manager.dispose();

    fireMotionChange(true);

    expect(cb).not.toHaveBeenCalled();
  });

  it('unsubscribe function prevents further callbacks', () => {
    const manager = createMotionManager();
    const cb = vi.fn();

    const unsub = manager.onChange(cb);
    unsub();

    fireMotionChange(true);

    expect(cb).not.toHaveBeenCalled();
    manager.dispose();
  });
});
