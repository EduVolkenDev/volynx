import { randomUUID } from 'node:crypto'
import { execFileSync, spawnSync } from 'node:child_process'
import { readFileSync, realpathSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, sep } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { readCatalog } from './catalog'
import { readOverview } from './overview'
import { createSupabaseSource } from './supabase-source'

// Opt-in only: runs against an isolated local Supabase stack, never a remote URL.
const workdir = process.env.CLOUD_CONSOLE_LOCAL_E2E
const suite = workdir ? describe : describe.skip
const projectId = workdir ? readFileSync(join(workdir, 'supabase/config.toml'), 'utf8').match(/^project_id = "([^"]+)"/m)?.[1] : null
const allowedTemporaryRoots = [realpathSync('/tmp'), realpathSync(tmpdir())]
if (workdir && (!allowedTemporaryRoots.some(root => realpathSync(workdir).startsWith(`${root}${sep}volynx-console-auth.`)) || !projectId?.startsWith('volynx-cloud-console-auth-test'))) {
  throw new Error('Cloud Console E2E must target its disposable local project')
}
const container = `supabase_db_${projectId}`
const id = () => randomUUID()
const orgA = id(), orgB = id(), clientA = id(), clientB = id(), clientC = id()
const productA = id(), productB = id(), productC = id()
const environmentA = id(), environmentB = id(), environmentC = id()
const runTag = id().replace(/-/g, '').slice(0, 10).toUpperCase()
const password = `VlxTest-${id()}!`
const email = (label: string) => `console-${label}-${id()}@example.test`

function sql(statement: string) {
  const result = spawnSync('docker', ['exec', '-i', container, 'psql', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'postgres'], {
    input: statement, encoding: 'utf8', timeout: 30000
  })
  if (result.status !== 0) throw new Error(result.stderr || `Local SQL failed: ${result.status}`)
}

suite('Cloud Console local Auth/PostgREST boundary', () => {
  let apiUrl = ''
  let anonKey = ''
  const users: Record<string, { id: string; token: string }> = {}

  beforeAll(async () => {
    const status = JSON.parse(execFileSync('supabase', ['status', '--workdir', workdir!, '--output', 'json'], { encoding: 'utf8' }))
    apiUrl = status.API_URL
    anonKey = status.ANON_KEY
    const parsedUrl = new URL(apiUrl)
    if (parsedUrl.protocol !== 'http:' || parsedUrl.hostname !== '127.0.0.1' || parsedUrl.port === '54321') {
      throw new Error('Refusing to test a non-disposable Supabase URL')
    }
    process.env.NEXT_PUBLIC_SUPABASE_URL = apiUrl
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = anonKey
    const admin = createClient(apiUrl, status.SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
    for (const label of ['operator', 'viewerA', 'viewerB', 'outsider']) {
      const address = email(label)
      const created = await admin.auth.admin.createUser({ email: address, password, email_confirm: true })
      if (created.error || !created.data.user) throw created.error ?? new Error('Local user creation failed')
      const auth = createClient(apiUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })
      const signedIn = await auth.auth.signInWithPassword({ email: address, password })
      if (signedIn.error || !signedIn.data.session) throw signedIn.error ?? new Error('Local login failed')
      users[label] = { id: created.data.user.id, token: signedIn.data.session.access_token }
    }
    sql(`
      INSERT INTO public.organizations(id,name,slug) VALUES
        ('${orgA}','Cloud E2E A','cloud-e2e-${orgA}'),
        ('${orgB}','Cloud E2E B','cloud-e2e-${orgB}');
      INSERT INTO public.cloud_console_members(platform_organization_id,user_id,role) VALUES
        ('${orgA}','${users.operator.id}','volynx_operator');
      INSERT INTO public.cloud_clients(id,platform_organization_id,name,slug) VALUES
        ('${clientA}','${orgA}','Client A','client-a'),
        ('${clientB}','${orgA}','Client B','client-b'),
        ('${clientC}','${orgB}','Client C','client-c');
      INSERT INTO public.cloud_client_members(client_id,user_id,role) VALUES
        ('${clientA}','${users.viewerA.id}','client_viewer'),
        ('${clientB}','${users.viewerB.id}','client_viewer');
      INSERT INTO public.cloud_products(id,platform_organization_id,client_id,volynx_id,name,slug) VALUES
        ('${productA}','${orgA}','${clientA}','VLX-${runTag}A-001','Product A','product-a'),
        ('${productB}','${orgA}','${clientB}','VLX-${runTag}B-001','Product B','product-b'),
        ('${productC}','${orgB}','${clientC}','VLX-${runTag}C-001','Product C','product-c');
      INSERT INTO public.cloud_environments(id,platform_organization_id,product_id,environment_key,name) VALUES
        ('${environmentA}','${orgA}','${productA}','production','Production'),
        ('${environmentB}','${orgA}','${productB}','production','Production'),
        ('${environmentC}','${orgB}','${productC}','production','Production');
      INSERT INTO public.cloud_deployments(platform_organization_id,product_id,environment_id,provider,commit_sha)
        VALUES ('${orgA}','${productA}','${environmentA}','fixture','PRIVATE_COMMIT');
    `)
  }, 60000)

  afterAll(() => {
    // Container removal is handled by the one-off local Supabase stack teardown.
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  })

  const catalog = async (label: string) => {
    const response = await readCatalog(new Request('http://localhost/api/cloud/v1/catalog', {
      headers: { Authorization: `Bearer ${users[label].token}` }
    }), { source: createSupabaseSource })
    return { status: response.status, body: await response.json() }
  }
  const overview = async (label: string, product: string, environment: string) => {
    const response = await readOverview(new Request(`http://localhost/api/cloud/v1/overview?productId=${product}&environmentId=${environment}`, {
      headers: { Authorization: `Bearer ${users[label].token}` }
    }), { source: createSupabaseSource })
    return { status: response.status, body: await response.json() }
  }

  it('real password login and JWT limit the catalog by client and organization', async () => {
    const a = await catalog('viewerA')
    const b = await catalog('viewerB')
    const operator = await catalog('operator')
    const outsider = await catalog('outsider')
    for (const result of [a, b, operator, outsider]) expect(result.status, JSON.stringify(result.body.error)).toBe(200)
    expect(a.body.data.entries.map((entry: { product: { id: string } }) => entry.product.id)).toEqual([productA])
    expect(b.body.data.entries.map((entry: { product: { id: string } }) => entry.product.id)).toEqual([productB])
    expect(operator.body.data.entries.map((entry: { product: { id: string } }) => entry.product.id).sort()).toEqual([productA, productB].sort())
    expect(outsider.body.data.entries).toEqual([])
  })

  it('Overview hides cross-client and cross-organization product IDs', async () => {
    expect((await overview('viewerA', productA, environmentA)).status).toBe(200)
    expect((await overview('viewerA', productB, environmentB)).status).toBe(404)
    expect((await overview('operator', productC, environmentC)).status).toBe(404)
    expect((await overview('outsider', productA, environmentA)).status).toBe(404)
  })

  it('direct Data API also enforces RLS and denies commit hashes', async () => {
    const client = createClient(apiUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${users.viewerA.token}` } }
    })
    const products = await client.from('cloud_products').select('id')
    expect(products.error).toBeNull()
    expect(products.data).toEqual([{ id: productA }])
    const forbidden = await client.from('cloud_deployments').select('commit_sha')
    expect(forbidden.data).toBeNull()
    expect(forbidden.error?.code).toBe('42501')
  })

  it('revocation takes effect on the next API read with the same JWT', async () => {
    sql(`DELETE FROM public.cloud_client_members WHERE user_id='${users.viewerA.id}'`)
    const result = await catalog('viewerA')
    expect(result.status, JSON.stringify(result.body.error)).toBe(200)
    expect(result.body.data.entries).toEqual([])
    expect((await overview('viewerA', productA, environmentA)).status).toBe(404)
  })
})
