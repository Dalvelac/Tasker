import assert from 'node:assert/strict'
import test from 'node:test'
import { planner } from './support/plannerHarness.ts'

test('retries create once and restores the original identity, completion and tags across chained undo',async t=>{
  const h=planner(t)
  const make=()=>h.create({title:'Log',status:'done'},'retry-key')
  const [a,b]=await Promise.all([make(),make()])
  const first=(await a.json()).data
  assert.equal((await b.json()).data.id,first.id)
  const stamp=h.row(first.id).completed_at
  h.sql.exec("INSERT INTO tags(id,name) VALUES(1,'Tagged')")
  h.sql.prepare('INSERT INTO task_tags VALUES(?,1)').run(first.id)
  const edit=(await(await h.patch(first.id,{title:'Renamed'},0)).json()).data
  assert.equal((await h.patch(first.id,{title:'Stale'},0)).status,409)
  const del=(await(await h.remove(first.id)).json()).data
  assert.equal(h.row(first.id).deleted,1)
  assert.equal((await h.undo(del.undoToken)).status,200)
  assert.equal(h.row(first.id).completed_at,stamp)
  assert.equal((await h.undo(edit.undoToken)).status,200)
  assert.equal(h.row(first.id).title,'Log')
  assert.equal(h.sql.prepare('SELECT task_id FROM task_tags').get()?.task_id,first.id)
  assert.equal((await h.undo(first.undoToken)).status,200)
  assert.equal((await h.undo(first.undoToken)).status,200)
  assert.equal(h.sql.prepare('SELECT COUNT(*) n FROM tasks WHERE deleted=0').get()?.n,0)
})
test('completion uses the edited schedule, creates one successor concurrently and protects an edited successor on undo',async t=>{
  const h=planner(t)
  const {id}=(await(await h.create({title:'Original',date:'2026-11-18',recurrence_type:'daily'})).json()).data
  const input={title:'Revised',date:'2026-11-20',recurrence_type:'weekly',recurrence_days:'5,0',status:'done'}
  const change=(await(await h.patch(id,input)).json()).data
  const child=h.sql.prepare('SELECT * FROM tasks WHERE spawned_by=?').get(id)!
  assert.equal(child.date,'2026-11-22');assert.equal(child.title,'Revised')
  assert.equal((await h.undo(change.undoToken)).status,200)
  assert.equal(h.row(Number(child.id)).deleted,1)
  const responses=await Promise.all([h.patch(id,{status:'done'}),h.patch(id,{status:'done'})])
  const bodies=await Promise.all(responses.map(r=>r.json()))
  const token=bodies.find(b=>b.data?.undoToken)?.data.undoToken
  assert.ok(token)
  const remaining=h.sql.prepare('SELECT * FROM tasks WHERE spawned_by=? AND deleted=0').all(id)
  assert.equal(remaining.length,1)
  await h.patch(Number(remaining[0].id),{notes:'Keep this work'})
  assert.equal((await h.undo(token)).status,409)
  assert.equal(h.row(Number(remaining[0].id)).notes,'Keep this work')
})
test('month-end anchor, alternate weeks including Sunday, and inclusive end dates survive completion',async t=>{
  const h=planner(t)
  async function series(input:object){return (await(await h.create({title:'Recurring',...input})).json()).data.id}
  async function next(id:number){await h.patch(id,{status:'done'});return h.sql.prepare('SELECT id,date FROM tasks WHERE spawned_by=? AND deleted=0').get(id)}
  const root=await series({date:'2027-01-31',recurrence_type:'monthly',recurrence_until:'2027-03-31'})
  const feb=await next(root);assert.equal(feb?.date,'2027-02-28')
  const march=await next(Number(feb?.id));assert.equal(march?.date,'2027-03-31');assert.equal(await next(Number(march?.id)),undefined)
  const sunday=await series({date:'2026-11-22',recurrence_type:'weekly',recurrence_days:'1,0',recurrence_interval:2})
  assert.equal((await next(sunday))?.date,'2026-11-30')
})
test('validates schedule values and distinguishes missing or conflicting records',async t=>{
  const h=planner(t)
  for(const input of [{date:'2027-02-30'},{start_time:'25:80'},{duration_minutes:-1},{type:'time_block'},{status:'postponed'}, {status:'postponed',date:'2000-01-01'}]){
    assert.equal((await h.create({title:'Invalid',...input})).status,400)
  }
  assert.equal((await h.patch(54321,{title:'Missing'})).status,404)
  assert.equal((await h.remove(54321)).status,404)
})

test('a returned task can be rescheduled without postponing it again', async t=>{
  const h=planner(t)
  const {lastInsertRowid}=h.sql.prepare("INSERT INTO tasks(title,status,date) VALUES('Return','postponed','2000-01-01')").run()
  const id=Number(lastInsertRowid)
  assert.equal((await h.patch(id,{date:'2090-01-01'})).status,200)
  assert.equal(h.row(id).status,'pending')
  assert.equal((await h.patch(id,{status:'postponed',date:'2000-01-01'})).status,400)
  assert.equal(h.row(id).date,'2090-01-01')
})
