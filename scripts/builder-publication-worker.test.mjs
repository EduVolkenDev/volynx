import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import { buildSync } from 'esbuild';

const helper = readFileSync('cloudflare/builder-publisher/publication-authority.mjs','utf8').replace('export async function','async function');
function harness({begin={ok:true,slug:'qa-only',builder_data:{}},finish={ok:true},storageFailure=false,finalizeFailure=false,beginFailure=false}={}) {
 const calls=[];
 const context={crypto:globalThis.crypto,AbortSignal,
  fetch:async(url,options)=>{
   const name=url.split('/').at(-1);calls.push(name);
   assert.equal(options.headers.apikey,'server-only');
   if(name==='begin_builder_publication' && beginFailure) throw Error('offline');
   if(name==='finish_builder_publication' && finalizeFailure) return new Response('{}',{status:500});
   return Response.json(name==='begin_builder_publication'?begin:finish);
  },
 };
 runInNewContext(helper+'; this.execute=executePublication;',context);
 const env={SUPABASE_URL:'https://db.invalid',SUPABASE_SERVICE_ROLE_KEY:'server-only',SITES:{
  put:async()=>{calls.push('put');if(storageFailure)throw Error('uncertain');},
  delete:async()=>{calls.push('delete');if(storageFailure)throw Error('uncertain');},
 }};
 return {calls,run:operation=>context.execute(env,'owner','project',operation,()=>'<html>QA</html>')};
}
test('no R2 write when plan, owner, conflict, or database admission is rejected',async()=>{
 for(const error of ['publish_limit_reached','forbidden','publication_busy','slug_in_use','plan_unavailable']) {
  const h=harness({begin:{error}});const result=await h.run('publish');
  assert.equal(result.error,error);assert.deepEqual(h.calls,['begin_builder_publication']);
 }
 const h=harness({beginFailure:true});assert.equal((await h.run('publish')).status,503);assert.equal(h.calls.length,1);
});
test('successful publish and unpublish finalize only after storage completes',async()=>{
 for(const operation of ['publish','unpublish']) {
  const h=harness();assert.equal((await h.run(operation)).ok,true);
  assert.deepEqual(h.calls,['begin_builder_publication',operation==='publish'?'put':'delete','finish_builder_publication']);
 }
});
test('uncertain storage/finalization failures never report success or free a slot',async()=>{
 for(const operation of ['publish','unpublish'])for(const options of [{storageFailure:true},{finalizeFailure:true},{finish:{error:'publication_conflict'}}]) {
  const h=harness(options);const r=await h.run(operation);
  assert.equal(r.status,503);assert.equal(r.error,'publication_needs_review');
  assert.ok(!h.calls.includes('release'));
  if(options.storageFailure) assert.ok(!h.calls.includes('finish_builder_publication'));
 }
});
test('malformed admission cannot select an arbitrary storage path',async()=>{
 const h=harness({begin:{ok:true,slug:'../escape'}});
 assert.equal((await h.run('publish')).status,503);assert.equal(h.calls.length,1);
});
test('actual recovered Worker remains protected before publication admission',{
 skip:!process.env.VOLYNX_PUBLISHER_SOURCE && 'Set VOLYNX_PUBLISHER_SOURCE to recovered Worker',
},async()=>{
 const output=buildSync({entryPoints:[process.env.VOLYNX_PUBLISHER_SOURCE],bundle:true,write:false,format:'iife',globalName:'Publisher',platform:'browser'}).outputFiles[0].text;
 for(const path of ['/publish','/unpublish']) {
  const calls=[];
  const context={Request,Response,Headers,URL,crypto:globalThis.crypto,AbortSignal,fetch:async(url)=>{
   calls.push(String(url));
   if(String(url).endsWith('/auth/v1/user'))return Response.json({id:'owner'});
   return Response.json({error:'publish_limit_reached'});
  }};
  runInNewContext(output,context);
  const env={SUPABASE_URL:'https://db.invalid',SUPABASE_ANON_KEY:'anon',SUPABASE_SERVICE_ROLE_KEY:'server',SITES:{put:()=>assert.fail('R2 must not write'),delete:()=>assert.fail('R2 must not delete')}};
  const unauth=await context.Publisher.default.fetch(new Request('https://api.volynx.world'+path,{method:'POST'}),env);
  assert.equal(unauth.status,401);assert.equal(calls.length,0);
  const auth=await context.Publisher.default.fetch(new Request('https://api.volynx.world'+path,{method:'POST',headers:{Authorization:'Bearer qa'},body:JSON.stringify({projectId:'qa'})}),env);
  assert.equal(auth.status,403);assert.equal((await auth.json()).error,'publish_limit_reached');
 }
});
