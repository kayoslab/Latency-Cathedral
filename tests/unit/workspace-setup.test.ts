import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = resolve(__dirname, '../..');

function fileExists(relativePath: string): boolean {
  return existsSync(resolve(ROOT, relativePath));
}

function readJson(relativePath: string): unknown {
  return JSON.parse(readFileSync(resolve(ROOT, relativePath), 'utf-8'));
}

describe('US-001: Workspace initialization', () => {
  describe('package.json', () => {
    it('exists at the project root', () => {
      expect(fileExists('package.json')).toBe(true);
    });

    it('has required npm scripts', () => {
      const pkg = readJson('package.json') as Record<string, unknown>;
      const scripts = pkg.scripts as Record<string, string>;

      expect(scripts.dev).toBeDefined();
      expect(scripts.build).toBeDefined();
      expect(scripts.preview).toBeDefined();
      expect(scripts.lint).toBeDefined();
      expect(scripts.typecheck).toBeDefined();
      expect(scripts.test).toBeDefined();
      expect(scripts['test:e2e']).toBeDefined();
    });

    it('is configured as an ES module', () => {
      const pkg = readJson('package.json') as Record<string, string>;
      expect(pkg.type).toBe('module');
    });
  });

  describe('node_modules', () => {
    it('npm install has been run (node_modules exists)', () => {
      expect(fileExists('node_modules')).toBe(true);
    });
  });

  describe('TypeScript configuration', () => {
    it('tsconfig.json exists', () => {
      expect(fileExists('tsconfig.json')).toBe(true);
    });

    it('typecheck passes with no errors', () => {
      expect(() => {
        execSync('npm run typecheck', { cwd: ROOT, stdio: 'pipe' });
      }).not.toThrow();
    });
  });

  describe('Vite configuration', () => {
    it('vite.config.ts exists', () => {
      expect(fileExists('vite.config.ts')).toBe(true);
    });
  });

  describe('entry point', () => {
    it('index.html exists at the project root', () => {
      expect(fileExists('index.html')).toBe(true);
    });

    it('index.html references src/main.ts', () => {
      const html = readFileSync(resolve(ROOT, 'index.html'), 'utf-8');
      expect(html).toContain('src/main.ts');
    });

    it('src/main.ts exists', () => {
      expect(fileExists('src/main.ts')).toBe(true);
    });
  });

  describe('project scaffolding', () => {
    it.each([
      'src/domain',
      'src/metrics',
      'src/render',
      'src/ui',
      'public',
      'tests',
      'docs/adr',
    ])('directory %s exists', (dir) => {
      expect(fileExists(dir)).toBe(true);
    });
  });

  describe('probe asset', () => {
    it('public/ contains at least one probe asset', () => {
      expect(fileExists('public')).toBe(true);
      // A probe asset should exist for same-origin measurement
      const { readdirSync } = require('node:fs');
      const files = readdirSync(resolve(ROOT, 'public')) as string[];
      expect(files.length).toBeGreaterThan(0);
    });
  });

  describe('production build', () => {
    it('npm run build succeeds', () => {
      expect(() => {
        execSync('npm run build', { cwd: ROOT, stdio: 'pipe' });
      }).not.toThrow();
    });

    it('dist/ directory is created after build', () => {
      // Build should have been run by the previous test or CI
      expect(fileExists('dist')).toBe(true);
    });

    it('dist/ contains index.html', () => {
      expect(fileExists('dist/index.html')).toBe(true);
    });
  });

  describe('lint', () => {
    it('eslint runs without errors', () => {
      expect(() => {
        execSync('npm run lint', { cwd: ROOT, stdio: 'pipe' });
      }).not.toThrow();
    });
  });
});
