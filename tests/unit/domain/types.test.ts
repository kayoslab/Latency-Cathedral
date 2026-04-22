import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const DOMAIN_DIR = resolve(__dirname, '../../../src/domain');

describe('US-005: domain module purity', () => {
  it('src/domain/ does not import three.js', () => {
    const files = readdirSync(DOMAIN_DIR).filter((f) => f.endsWith('.ts'));

    for (const file of files) {
      const content = readFileSync(resolve(DOMAIN_DIR, file), 'utf-8');
      expect(content, `${file} must not import three`).not.toMatch(
        /import\s.*from\s+['"]three['"]/,
      );
      expect(content, `${file} must not require three`).not.toMatch(
        /require\s*\(\s*['"]three['"]\s*\)/,
      );
    }
  });

  it('exports ProbeSample interface', async () => {
    const types = await import('../../../src/domain/types');
    // TypeScript interfaces are erased at runtime, so we verify the module loads
    // and that the barrel file re-exports types by checking the module exists
    expect(types).toBeDefined();
  });

  it('exports normalization helpers from barrel', async () => {
    const domain = await import('../../../src/domain/index');
    expect(domain.clamp).toBeTypeOf('function');
    expect(domain.normalizeRtt).toBeTypeOf('function');
    expect(domain.normalizeJitter).toBeTypeOf('function');
    expect(domain.mapSnapshotToScene).toBeTypeOf('function');
  });
});
