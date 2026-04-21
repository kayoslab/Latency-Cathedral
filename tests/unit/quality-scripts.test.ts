import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = resolve(__dirname, '../..');

function readJson(relativePath: string): unknown {
  return JSON.parse(readFileSync(resolve(ROOT, relativePath), 'utf-8'));
}

describe('US-002: Linting, typecheck, and unit test scripts', () => {
  describe('npm scripts exist in package.json', () => {
    const pkg = readJson('package.json') as { scripts: Record<string, string> };

    it('has a "lint" script that runs eslint', () => {
      expect(pkg.scripts.lint).toBeDefined();
      expect(pkg.scripts.lint).toContain('eslint');
    });

    it('has a "typecheck" script that runs tsc --noEmit', () => {
      expect(pkg.scripts.typecheck).toBeDefined();
      expect(pkg.scripts.typecheck).toContain('tsc');
      expect(pkg.scripts.typecheck).toContain('--noEmit');
    });

    it('has a "test" script that runs vitest', () => {
      expect(pkg.scripts.test).toBeDefined();
      expect(pkg.scripts.test).toContain('vitest');
    });
  });

  describe('npm run lint succeeds', () => {
    it('exits with code 0 and produces no errors', () => {
      expect(() => {
        execSync('npm run lint', { cwd: ROOT, stdio: 'pipe' });
      }).not.toThrow();
    });
  });

  describe('npm run typecheck succeeds', () => {
    it('exits with code 0 and reports no type errors', () => {
      expect(() => {
        execSync('npm run typecheck', { cwd: ROOT, stdio: 'pipe' });
      }).not.toThrow();
    });
  });

  describe('a sample unit test passes', () => {
    it('clampPixelRatio unit tests exist and pass', () => {
      const result = execSync(
        'npx vitest run tests/unit/clampPixelRatio.test.ts --reporter=json',
        { cwd: ROOT, stdio: 'pipe' },
      );
      const output = JSON.parse(result.toString());
      expect(output.numPassedTests).toBeGreaterThan(0);
      expect(output.numFailedTests).toBe(0);
    });
  });
});
