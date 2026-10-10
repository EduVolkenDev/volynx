import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

// Run only against the specifically isolated, throwaway local Supabase stack.
const workdir = process.env.VOLYNX_CONSOLE_E2E_WORKDIR
assert.ok(workdir?.startsWith('/tmp/volynx-console-e2e.'), 'Expected disposable /tmp workdir')
const config = readFileSync(resolve(workdir, 'supabase/config.toml'), 'utf8')
const projectId = config.match(/^project_id\s*=\s*"([^"]+)"/m)?.[1]
assert.match(projectId ?? '', /^volynx-console-e2e-[a-z0-9]+$/)
const status = spawnSync('supabase', ['status', '--workdir', workdir, '--output', 'json'], { encoding: 'utf8' })
assert.equal(status.status, 0, 'Disposable Supabase stack must be running')
const local = JSON.parse(status.stdout)
assert.equal(local.API_URL, 'http://127.0.0.1:56421')
assert.ok(local.ANON_KEY && local.SERVICE_ROLE_KEY)

const appDir = resolve(fileURLToPath(new URL('..', import.meta.url)))
const base = process.env.VOLYNX_CONSOLE_E2E_TARGET ?? 'http://127.0.0.1:3307'
assert.ok(['http://127.0.0.1:3307', 'http://127.0.0.1:8787'].includes(base), 'E2E target must be local')
const admin = createClient(local.API_URL, local.SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
const publicClient = createClient(local.API_URL, local.ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
const marker = randomUUID().replaceAll('-', '').slice(0, 12)
const password = `${randomUUID()}Aa!9`
const fixtures = [
  { key: 'A', org: 'A', role: 'client_admin' },
  { key: 'B', org: 'A', role: 'client_viewer' },
  { key: 'C', org: 'B', role: 'client_viewer' },
]

async function insert(table, row) {
  const { error } = await admin.from(table).insert(row)
  assert.ifError(error, `Could not insert ${table}: ${error?.message}`)
}

async function request(path, token) {
  const response = await fetch(`${base}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
  const body = await response.json()
  const cacheControl = response.headers.get('cache-control')?.split(',').map(value => value.trim()) ?? []
  assert.ok(cacheControl.includes('private') && cacheControl.includes('no-store'))
  assert.ok(response.headers.get('vary')?.split(',').map(value => value.trim().toLowerCase()).includes('authorization'))
  return { status: response.status, body }
}

async function waitForApp(child) {
  for (let i = 0; i < 120; i++) {
    if (child && child.exitCode !== null) throw new Error('Next dev server exited before readiness')
    try {
      const response = await fetch(`${base}/api/cloud/v1/catalog`, { signal: AbortSignal.timeout(1500) })
      if (response.status === 401) return
    } catch { /* Next is starting. */ }
    await delay(1000)
  }
  throw new Error('Next dev server did not become ready within 120 seconds')
}

let logs = ''
const child = base.endsWith(':3307') ? spawn(process.execPath, [resolve(appDir, 'node_modules/next/dist/bin/next'), 'dev', '--port', '3307', '--hostname', '127.0.0.1'], {
  cwd: appDir,
  detached: true,
  env: {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: local.API_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: local.ANON_KEY,
    NEXT_TELEMETRY_DISABLED: '1',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
}) : null
for (const stream of child ? [child.stdout, child.stderr] : []) {
  stream.on('data', chunk => { logs = `${logs}${chunk}`.slice(-5000) })
}

try {
  await waitForApp(child)
  console.log(`PASS: ${child ? 'Next local' : 'Worker local'} conectado ao Supabase descartável`)

  for (const fixture of fixtures) {
    fixture.email = `console-e2e-${marker}-${fixture.key.toLowerCase()}@example.test`
    const { data, error } = await admin.auth.admin.createUser({ email: fixture.email, password, email_confirm: true })
    assert.ifError(error)
    fixture.userId = data.user.id
  }
  for (const org of ['A', 'B']) {
    const id = randomUUID()
    for (const fixture of fixtures.filter(item => item.org === org)) fixture.orgId = id
    await insert('organizations', { id, name: `Synthetic Org ${org}`, slug: `console-e2e-${marker}-${org.toLowerCase()}` })
  }
  for (const fixture of fixtures) {
    fixture.clientId = randomUUID()
    fixture.productId = randomUUID()
    fixture.environmentId = randomUUID()
    await insert('cloud_clients', { id: fixture.clientId, platform_organization_id: fixture.orgId, name: `Synthetic Client ${fixture.key}`, slug: `test-${marker}-${fixture.key.toLowerCase()}` })
    await insert('cloud_client_members', { client_id: fixture.clientId, user_id: fixture.userId, role: fixture.role })
    await insert('cloud_products', { id: fixture.productId, platform_organization_id: fixture.orgId, client_id: fixture.clientId, volynx_id: `VLX-E2E${marker.toUpperCase()}${fixture.key}-001`, name: `Synthetic Product ${fixture.key}`, slug: `product-${fixture.key.toLowerCase()}` })
    await insert('cloud_environments', { id: fixture.environmentId, platform_organization_id: fixture.orgId, product_id: fixture.productId, environment_key: 'production', name: 'Production' })
    const { data, error } = await publicClient.auth.signInWithPassword({ email: fixture.email, password })
    assert.ifError(error)
    fixture.token = data.session.access_token
  }
  console.log('PASS: 3 logins reais no Auth local, 3 clientes e 2 organizações sintéticas')

  for (const fixture of fixtures) {
    const scoped = createClient(local.API_URL, local.ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${fixture.token}` } },
    })
    const privateColumn = await scoped.from('cloud_deployments').select('commit_sha').limit(1)
    assert.equal(privateColumn.data, null)
    assert.equal(privateColumn.error?.code, '42501', `Private deployment column exposed to ${fixture.key}`)
  }
  console.log('PASS: Data API nega commit_sha privado aos 3 clientes')

  const invalidEvidence = await admin.from('cloud_resources').insert({
    platform_organization_id: fixtures[0].orgId,
    product_id: fixtures[0].productId,
    environment_id: fixtures[0].environmentId,
    provider: 'synthetic', resource_kind: 'database', name: 'Evidence check', status: 'operational',
  })
  assert.equal(invalidEvidence.error?.code, '23514', 'DB must reject positive status without evidence')
  await insert('cloud_resources', {
    platform_organization_id: fixtures[0].orgId,
    product_id: fixtures[0].productId,
    environment_id: fixtures[0].environmentId,
    provider: 'synthetic', resource_kind: 'database', name: 'Local test resource',
    status: 'operational', source: 'synthetic-local-test', checked_at: new Date().toISOString(),
  })
  console.log('PASS: banco rejeita status positivo sem fonte e horário')

  const unauthenticated = await request('/api/cloud/v1/catalog')
  assert.equal(unauthenticated.status, 401)
  const invalidSession = await request('/api/cloud/v1/catalog', 'invalid-token')
  assert.equal(invalidSession.status, 401)
  console.log('PASS: catálogo bloqueia sessões ausentes e inválidas')

  for (const viewer of fixtures) {
    const catalog = await request('/api/cloud/v1/catalog', viewer.token)
    assert.equal(catalog.status, 200, JSON.stringify(catalog.body))
    assert.equal(catalog.body.ok, true)
    assert.equal(catalog.body.data.entries.length, 1, `Catalog leak for ${viewer.key}`)
    assert.equal(catalog.body.data.entries[0].product.id, viewer.productId)

    for (const target of fixtures) {
      const path = `/api/cloud/v1/overview?productId=${target.productId}&environmentId=${target.environmentId}`
      const result = await request(path, viewer.token)
      if (target === viewer) {
        assert.equal(result.status, 200, JSON.stringify(result.body))
        assert.equal(result.body.ok, true)
        assert.equal(result.body.context.clientId, viewer.clientId)
        assert.equal(result.body.context.role, viewer.role)
        assert.equal(result.body.data.identity.id, viewer.productId)
        assert.equal(result.body.data.resources.state, viewer.key === 'A' ? 'ready' : 'pending')
        if (viewer.key === 'A') {
          assert.equal(result.body.data.resources.data[0].source, 'synthetic-local-test')
          assert.ok(result.body.data.resources.data[0].lastCheckedAt)
        }
      } else {
        assert.equal(result.status, 404, `Cross-client access ${viewer.key}->${target.key}: ${JSON.stringify(result.body)}`)
        assert.equal(result.body.error.code, 'not_found')
      }
    }
    console.log(`PASS: ${viewer.key} vê só seu catálogo/overview; outros clientes retornam 404`)
  }

  const noTokenOverview = await request(`/api/cloud/v1/overview?productId=${fixtures[0].productId}&environmentId=${fixtures[0].environmentId}`)
  assert.equal(noTokenOverview.status, 401)
  const malformed = await request('/api/cloud/v1/overview?productId=wrong&environmentId=wrong', fixtures[0].token)
  assert.equal(malformed.status, 400)
  console.log('PASS: overview valida sessão, IDs, role e evidência da leitura positiva')
  if (!child) {
    const blocked = await fetch(`${base}/api/stripe/webhook`)
    assert.equal(blocked.status, 404)
    const preview = await fetch(`${base}/console/preview`)
    assert.equal(preview.status, 200)
    console.log('PASS: Worker libera preview e bloqueia rota fora do Console')
  }
  console.log('RESULT: teste E2E local concluído; nenhum dado de produção acessado')
  if (process.env.VOLYNX_CONSOLE_E2E_BROWSER === '1') {
    console.log(`BROWSER_EMAIL=${fixtures[0].email}`)
    console.log(`BROWSER_PASSWORD=${password}`)
  }
} catch (error) {
  console.error('FAIL:', error)
  console.error('Next log tail:', logs.replaceAll(local.ANON_KEY, '[redacted]').replaceAll(local.SERVICE_ROLE_KEY, '[redacted]'))
  process.exitCode = 1
} finally {
  if (child) {
    try { process.kill(-child.pid, 'SIGTERM') } catch { /* Server already stopped. */ }
    await delay(1000)
  }
}
