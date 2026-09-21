/**
 * The M0 content source: the synthetic fixture, served through the repository
 * interface so no scene or UI code reaches for the fixture directly.
 */

import { m0Content, type PalaceContent } from '../domain/index.ts';
import { ok, type ContentRepository, type StorageResult } from './repository.ts';

export function createMemoryContentRepository(
  content: PalaceContent = m0Content,
): ContentRepository {
  return {
    loadContent(): Promise<StorageResult<PalaceContent>> {
      return Promise.resolve(ok(content));
    },
  };
}
