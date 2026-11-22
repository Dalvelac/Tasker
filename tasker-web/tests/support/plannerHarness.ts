import { DatabaseSync } from 'node:sqlite'
import type { TestContext } from 'node:test'
import type { AppContext } from '../../functions/_shared/db.ts'
import { loadFunction, readProjectFile, sqliteBinding } from './functionHarness.ts'

type Handler=(context:AppContext)=>Promise<Response>
const tasks=loadFunction<Record<string,Handler>>('functions/api/tasks/index.ts')
const item=loadFunction<Record<string,Handler>>('functions/api/tasks/[id]/index.ts')
const undo=loadFunction<Record<string,Handler>>('functions/api/undo/[token].ts')
export function planner(t:TestContext) {
  const sql=new DatabaseSync(':memory:');t.after(()=>sql.close());sql.exec(readProjectFile('schema.sql'))
  const env={DB:sqliteBinding(sql)}
  function request(handler:Handler,method:string,params:Record<string,string>,data?:object,headers?:Record<string,string>,url='https://tasker.test/api/tasks') {
    return handler({env,params,request:new Request(url,{method,headers,...(data?{body:JSON.stringify(data)}:{})})})
  }
  return {sql,env,request,
    create:(data:object,key?:string)=>request(tasks.onRequestPost,'POST',{},data,key?{'Idempotency-Key':key}:undefined),
    patch:(id:number,data:object,revision?:number)=>request(item.onRequestPatch,'PATCH',{id:String(id)},data,revision===undefined?undefined:{'If-Match':String(revision)}),
    remove:(id:number)=>request(item.onRequestDelete,'DELETE',{id:String(id)}),
    undo:(token:string)=>request(undo.onRequestPost,'POST',{token}),
    row:(id:number)=>sql.prepare('SELECT * FROM tasks WHERE id=?').get(id)!,
  }
}
