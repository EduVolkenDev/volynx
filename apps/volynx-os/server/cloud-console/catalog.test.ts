import { describe, expect, it } from 'vitest'
import { readCatalog } from './catalog'
import type { ConsoleSource } from './overview'

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const org = id(1), client = id(2), product = id(3), environment = id(4)
const now = new Date('2026-09-28T12:00:00.000Z')

function source(overrides: { invalid?: boolean; throwOn?: string; manyCount?: number; absent?: boolean } = {}): ConsoleSource {
  const rows: Record<string, unknown[]> = {
    cloud_clients: [{ id: client, platform_organization_id: org, name: 'Client A' }],
    cloud_products: [{ id: product, platform_organization_id: org, client_id: client, name: 'Product A', volynx_id: 'VLX-A-001' },
      { id: id(5), platform_organization_id: org, client_id: id(9), name: 'Orphan', volynx_id: 'VLX-B-001' }],
    cloud_environments: [{ id: environment, platform_organization_id: org, product_id: product, environment_key: 'production', name: 'Production', kind: 'production' }]
  }
  if (overrides.invalid) rows.cloud_products = [{ id: product, token: 'PRIVATE_TOKEN' }]
  if (overrides.absent) rows.cloud_clients = []
  return {
    verify: async () => ({ userId: id(7), unavailable: false }),
    one: async () => null,
    many: async table => {
      if (table === overrides.throwOn) throw new Error('PRIVATE_PROVIDER_ERROR')
      if (overrides.manyCount && table === 'cloud_clients') return Array.from({ length: overrides.manyCount }, () => rows.cloud_clients[0])
      return rows[table] ?? []
    }
  }
}

async function read(auth = 'Bearer valid', overrides: Parameters<typeof source>[0] = {}) {
  const request = new Request('http://localhost/api/cloud/v1/catalog', { headers: auth ? { Authorization: auth } : {} })
  const response = await readCatalog(request, { source: () => source(overrides), now: () => now, referenceId: () => id(99) })
  return { status: response.status, headers: response.headers, body: await response.json() }
}

describe('Cloud catalog read boundary', () => {
  it('requires a bearer token and sets private no-store', async () => {
    const result = await read('')
    expect(result.status).toBe(401)
    expect(result.body.error.code).toBe('invalid_session')
    expect(result.headers.get('Cache-Control')).toBe('private, no-store')
  })
  it('returns only joined, authorized context rows', async () => {
    const result = await read()
    expect(result.status).toBe(200)
    expect(result.body.data.entries).toEqual([{
      client: { id: client, name: 'Client A' },
      product: { id: product, name: 'Product A', vlxId: 'VLX-A-001' },
      environment: { id: environment, key: 'production', name: 'Production', kind: 'production' }
    }])
    expect(JSON.stringify(result.body)).not.toContain('Orphan')
  })
  it('returns an honest empty catalog', async () => {
    const result = await read('Bearer valid', { absent: true })
    expect(result.body.data.entries).toEqual([])
  })
  it('fails closed on malformed rows and hides raw values', async () => {
    const result = await read('Bearer valid', { invalid: true })
    expect(result.status).toBe(503)
    expect(result.body.error.code).toBe('malformed_response')
    expect(JSON.stringify(result.body)).not.toContain('PRIVATE_TOKEN')
  })
  it('does not silently truncate a large catalog', async () => {
    const result = await read('Bearer valid', { manyCount: 100 })
    expect(result.status).toBe(503)
    expect(result.body.error.reason).toContain('page limit')
  })
  it('hides provider errors', async () => {
    const result = await read('Bearer valid', { throwOn: 'cloud_products' })
    expect(result.status).toBe(503)
    expect(JSON.stringify(result.body)).not.toContain('PRIVATE_PROVIDER_ERROR')
  })
})
