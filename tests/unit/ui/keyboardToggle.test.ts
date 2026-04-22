// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

async function loadModule() {
  const mod = await import('../../../src/ui/keyboardToggle');
  return mod.createKeyboardToggle;
}

describe('US-014: keyboardToggle', () => {
  let createKeyboardToggle: Awaited<ReturnType<typeof loadModule>>;

  beforeEach(async () => {
    vi.resetModules();
    createKeyboardToggle = await loadModule();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fires callback when the matching key is pressed', () => {
    const cb = vi.fn();
    const toggle = createKeyboardToggle('`', cb);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: '`' }));
    expect(cb).toHaveBeenCalledTimes(1);

    toggle.dispose();
  });

  it('fires callback on each matching keypress', () => {
    const cb = vi.fn();
    const toggle = createKeyboardToggle('`', cb);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: '`' }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '`' }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '`' }));
    expect(cb).toHaveBeenCalledTimes(3);

    toggle.dispose();
  });

  it('does not fire callback for non-matching keys', () => {
    const cb = vi.fn();
    const toggle = createKeyboardToggle('`', cb);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(cb).not.toHaveBeenCalled();

    toggle.dispose();
  });

  it('dispose removes the keydown listener', () => {
    const cb = vi.fn();
    const toggle = createKeyboardToggle('`', cb);

    toggle.dispose();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: '`' }));
    expect(cb).not.toHaveBeenCalled();
  });

  it('works with different key bindings', () => {
    const cb = vi.fn();
    const toggle = createKeyboardToggle('h', cb);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'h' }));
    expect(cb).toHaveBeenCalledTimes(1);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: '`' }));
    expect(cb).toHaveBeenCalledTimes(1); // still 1, backtick didn't match

    toggle.dispose();
  });
});
