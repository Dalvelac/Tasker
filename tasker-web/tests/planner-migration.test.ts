import assert from 'node:assert/strict'
import test from 'node:test'
import { DatabaseSync } from 'node:sqlite'
import { readProjectFile } from './support/functionHarness.ts'

test('upgrades vaults and mixed entries without changing IDs, content, relationships, or ID allocation', (t) => {
  const upgraded = new DatabaseSync(':memory:'),
    fresh = new DatabaseSync(':memory:')
  t.after(() => {
    upgraded.close()
    fresh.close()
  })
  fresh.exec(readProjectFile('schema.sql'))
  for (const name of [
    '0001_core_planner',
    '0002_plan_my_day',
    '0003_obsidian_source_path',
    '0004_obsidian_path_key',
    '0005_repair_obsidian_path_keys',
  ]) {
    upgraded.exec(readProjectFile('migrations/' + name + '.sql'))
  }
  upgraded.exec(`UPDATE sections SET description='Imported from Obsidian with 3 Markdown notes.' WHERE id=1;
    INSERT INTO tasks(id,title,section_id,source_path,notes) VALUES (10,'Reference',1,'Nested/Reference.md','    code'),(20,'Ambiguous',1,NULL,'original');
    INSERT INTO tasks(id,title,parent_task_id,source_path,status,completed_at) VALUES(21,'Mixed',20,'Mixed.md','done','2025-05-15 04:12:01');
    INSERT INTO tags(id,name) VALUES(12,'Keep');
    INSERT INTO task_tags VALUES(21,12);
    INSERT INTO tasks(id,title,section_id,parent_task_id) VALUES(30,'Keep after removal',997,998);
    INSERT INTO task_tags VALUES(30,999),(996,12);
    INSERT INTO tasks(id,title,source_path) VALUES(40,'Former series','Series.md');
    INSERT INTO tasks(id,title,parent_task_id) VALUES(41,'Surviving occurrence',40);
    INSERT INTO tasks(id,title) VALUES(500,'retired'); DELETE FROM tasks WHERE id=500;`)
  upgraded.exec(readProjectFile('migrations/0006_planner_integrity.sql'))
  const rows = upgraded.prepare('SELECT id,kind,notes,parent_task_id,completed_at FROM tasks ORDER BY id').all()
  assert.deepEqual(
    rows.map((r) => [r.id, r.kind]),
    [
      [10, 'note'],
      [20, 'review'],
      [21, 'review'],
      [30, 'task'],
      [40, 'review'],
      [41, 'task'],
    ],
  )
  assert.equal(rows[0].notes, '    code')
  assert.equal(rows[2].parent_task_id, 20)
  assert.equal(rows[2].completed_at, '2025-05-15 04:12:01')
  assert.equal(upgraded.prepare('SELECT tag_id FROM task_tags').get()?.tag_id, 12)
  assert.deepEqual(
    upgraded
      .prepare('SELECT relation,task_id,referenced_id FROM migration_0006_unresolved ORDER BY relation, task_id')
      .all()
      .map((row) => Object.values(row)),
    [
      ['parent', 30, 998],
      ['section', 30, 997],
      ['task_tag', 30, 999],
      ['task_tag', 996, 12],
    ],
  )
  assert.equal(upgraded.prepare('SELECT section_id FROM tasks WHERE id=30').get()?.section_id, null)
  assert.equal(upgraded.prepare('SELECT parent_task_id FROM tasks WHERE id=30').get()?.parent_task_id, null)
  assert.equal(Number(upgraded.prepare("INSERT INTO tasks(title) VALUES('new')").run().lastInsertRowid), 501)
  for (const table of ['tasks', 'task_tags', 'sections']) {
    const constraints = (db: DatabaseSync) =>
      db
        .prepare('PRAGMA foreign_key_list(' + table + ')')
        .all()
        .map((f) => [f.from, f.table, f.to, f.on_delete])
        .sort()
    assert.deepEqual(constraints(upgraded), constraints(fresh))
  }
  assert.deepEqual(upgraded.prepare('PRAGMA foreign_key_check').all(), [])
})
