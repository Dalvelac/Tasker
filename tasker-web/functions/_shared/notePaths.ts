import type { D1Database } from './db';
import { notePathKey } from '../../shared/notePathKey';

export { notePathKey };

// Migration leaves legacy keys NULL because SQLite lower() is ASCII-only.
// Claim the oldest matching legacy row without changing any note's contents.
// Other historical duplicates remain accessible by ID with NULL keys.
export async function claimLegacyNotePath(db: D1Database, sectionId: number, key: string) {
  const { results } = await db.prepare(
    `SELECT id, source_path FROM tasks
     WHERE section_id = ? AND source_path IS NOT NULL AND source_path_key IS NULL
     ORDER BY id ASC`,
  ).bind(sectionId).all<{ id: number; source_path: string }>();
  const existing = results.find((note) => notePathKey(note.source_path) === key);
  if (!existing) return;

  // The guard and assignment execute in one statement, so simultaneous claims
  // cannot violate the unique index or reclaim a note that was moved/renamed.
  await db.prepare(
    `UPDATE tasks SET source_path_key = ?
     WHERE id = ? AND section_id = ? AND source_path = ? AND source_path_key IS NULL
       AND NOT EXISTS (SELECT 1 FROM tasks WHERE section_id = ? AND source_path_key = ?)`,
  ).bind(key, existing.id, sectionId, existing.source_path, sectionId, key).run();
}
