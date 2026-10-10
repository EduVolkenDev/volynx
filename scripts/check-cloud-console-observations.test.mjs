import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { test } from 'node:test'

// Test the TypeScript implementation using the compiler already in this workspace.
const require = createRequire(import.meta.url)
const ts = require('typescript')
function loadTs(relative, dependencies = {}) {
  const source = readFileSync(new URL(relative, import.meta.url), 'utf8')
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const exports = {}
  vm.runInNewContext(code, { exports, require: name => {
    assert.ok(name in dependencies, `Unexpected runtime dependency: ${name}`)
    return dependencies[name]
  } })
  return exports
}
const contracts = loadTs('../contracts/cloud-console.ts')
const { validateObservation } = loadTs('../apps/volynx-os/server/cloud-console/observations.ts', { '../../../../contracts/cloud-console': contracts })
const now = new Date('2026-09-28T12:00:00Z')
const fresh = { status: 'operational', source: 'fixture-adapter', lastCheckedAt: '2026-09-28T11:59:30Z' }

test('verified fresh observation keeps status and calculates freshness', () => {
  const result = validateObservation(fresh,now,60000)
  assert.equal(result.ok,true)
  assert.equal(result.value.status,'operational')
  assert.equal(result.value.stale,false)
})
test('stale observation cannot be presented as live', () => {
  assert.equal(validateObservation({...fresh,lastCheckedAt:'2026-09-28T11:00:00Z'},now,60000).value.stale,true)
  assert.equal(validateObservation({...fresh,lastCheckedAt:'2026-09-28T11:59:00Z'},now,60000).value.stale,true)
})
test('missing configuration remains not_configured', () => {
  const result = validateObservation({status:'not_configured',source:null,lastCheckedAt:null},now,60000)
  assert.equal(result.ok,true)
  assert.equal(result.value.status,'not_configured')
})
for (const [label,value] of [
  ['missing source',{...fresh,source:null}],
  ['missing time',{...fresh,lastCheckedAt:null}],
  ['bad time',{...fresh,lastCheckedAt:'invalid'}],
  ['future time',{...fresh,lastCheckedAt:'2026-09-29T00:00:00Z'}],
  ['impossible date',{...fresh,lastCheckedAt:'2026-02-30T00:00:00Z'}],
  ['unknown enum',{...fresh,status:'secure'}],
  ['HTML response','<html>provider down</html>'],
  ['null response',null],
  ['missing fields',{status:'operational'}],
  ['source credential URL',{...fresh,source:'https://secret@example.test?token=private'}],
  ['contradictory configuration',{...fresh,status:'not_configured'}],
]) {
  test(`malformed provider data: ${label}`, () => {
    const result = validateObservation(value,now,60000)
    assert.equal(result.ok,false)
    assert.equal(result.code,'malformed_response')
    assert.equal(result.value.status,'unknown')
    assert.equal(result.value.source,null)
  })
}
test('provider fields and stale flags are never trusted or echoed', () => {
  const result = validateObservation({...fresh,stale:false,secret:'DO_NOT_ECHO',lastCheckedAt:'2026-09-28T10:00:00Z'},now,60000)
  assert.equal(result.value.stale,true)
  assert.equal('secret' in result.value,false)
})
test('unknown is distinct from confirmed operational', () => {
  const result = validateObservation({status:'unknown',source:null,lastCheckedAt:null},now,60000)
  assert.equal(result.value.status,'unknown')
})
