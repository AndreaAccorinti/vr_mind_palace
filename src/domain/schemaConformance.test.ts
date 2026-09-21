/**
 * Conformance against the supplied v1 contract.
 *
 * M0 builds its content in TypeScript rather than importing JSON, so nothing
 * would otherwise notice if the fixture drifted away from the schema M1's
 * importer will enforce. Validating here keeps the two in step from the start,
 * and validates the shipped example fixture against the shipped schema at the
 * same time.
 */

import Ajv, { type AnySchema } from 'ajv';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { m0Content } from './m0Content.ts';

const readJson = (relative: string): unknown =>
  JSON.parse(readFileSync(fileURLToPath(new URL(relative, import.meta.url)), 'utf-8'));

const schema = readJson('../../schemas/palace.schema.json') as AnySchema;
const example = readJson('../../examples/palace-example.json');

const ajv = new Ajv({ allErrors: true, strict: false });
const validate = ajv.compile(schema);

const errorText = () =>
  (validate.errors ?? []).map((error) => `${error.instancePath} ${error.message}`).join('\n');

/** Round-trips through JSON so the validator sees exactly what an export would. */
const asJson = (value: unknown): unknown => JSON.parse(JSON.stringify(value));

describe('palace content schema v1', () => {
  it('accepts the M0 fixture, so M1 can import what M0 renders', () => {
    const valid = validate(asJson(m0Content));
    expect(errorText()).toBe('');
    expect(valid).toBe(true);
  });

  it('accepts the supplied example fixture', () => {
    const valid = validate(example);
    expect(errorText()).toBe('');
    expect(valid).toBe(true);
  });

  it('rejects content that names an asset outside the catalogue', () => {
    const tampered = asJson(m0Content) as {
      items: { mnemonic: { nodes: { assetId: string }[] } }[];
    };
    const node = tampered.items[0]?.mnemonic.nodes[0];
    expect(node).toBeDefined();
    // A remote URL is exactly what the closed enum exists to keep out.
    node!.assetId = 'https://example.invalid/model.glb';
    expect(validate(tampered)).toBe(false);
  });

  it('rejects content declaring a different schema version', () => {
    expect(validate({ ...(asJson(m0Content) as object), schemaVersion: 2 })).toBe(false);
  });

  it('rejects unknown top-level properties', () => {
    // Review history belongs to a backup envelope, not the content contract.
    expect(validate({ ...(asJson(m0Content) as object), reviews: [] })).toBe(false);
  });
});
