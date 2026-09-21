/**
 * The layering rule, checked as a test as well as a lint rule.
 *
 * AGENTS.md: "Keep learning data and scheduling independent of React/Three.js."
 * A grep-level check is crude but it fails loudly the moment someone reaches for
 * a Vector3 inside the domain, which is exactly when it is cheapest to fix.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const domainDir = fileURLToPath(new URL('./domain', import.meta.url));

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return full.endsWith('.ts') && !full.endsWith('.test.ts') ? [full] : [];
  });
}

const FORBIDDEN = [
  { pattern: /from\s+['"]three['"]/, name: 'three' },
  { pattern: /from\s+['"]three\//, name: 'three submodule' },
  { pattern: /from\s+['"]react['"]/, name: 'react' },
  { pattern: /from\s+['"]react-dom/, name: 'react-dom' },
  { pattern: /from\s+['"]@react-three\//, name: '@react-three' },
  { pattern: /from\s+['"]\.\.\/scene\//, name: 'the scene layer' },
  { pattern: /from\s+['"]\.\.\/app\//, name: 'the app layer' },
  { pattern: /from\s+['"]\.\.\/persistence\//, name: 'the persistence layer' },
];

describe('the domain layer is renderer-independent', () => {
  const files = sourceFiles(domainDir);

  it('finds domain sources to check', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files)('%s imports no renderer, UI or storage module', (file) => {
    const source = readFileSync(file, 'utf-8');
    for (const { pattern, name } of FORBIDDEN) {
      expect(pattern.test(source), `${file} must not import ${name}`).toBe(false);
    }
  });

  it('touches no browser global, so it runs anywhere', () => {
    for (const file of files) {
      const source = readFileSync(file, 'utf-8');
      expect(/\b(document|window|localStorage|navigator)\./.test(source), file).toBe(false);
    }
  });
});
