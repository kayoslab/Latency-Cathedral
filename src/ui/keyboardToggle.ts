export function createKeyboardToggle(
  key: string,
  callback: () => void,
): { dispose(): void } {
  const handler = (e: KeyboardEvent) => {
    if (e.key === key) {
      callback();
    }
  };

  document.addEventListener('keydown', handler);

  return {
    dispose() {
      document.removeEventListener('keydown', handler);
    },
  };
}
