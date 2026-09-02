import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import worker from '../dist/server/index.js'

class FakeStatement {
  constructor(db, sql, values = []) { this.db = db; this.sql = sql.replace(/\s+/g, ' ').trim(); this.values = values }
  bind(...values) { return new FakeStatement(this.db, this.sql, values) }
  async run() {
    if (this.sql.startsWith('CREATE TABLE') || this.sql.startsWith('CREATE INDEX')) return { meta: { changes: 0 } }
    if (this.sql.startsWith('INSERT INTO demo_orders')) {
      const [id, order_number, customer_name, email, address, postal_code, region, items_json, subtotal, shipping, total, created_at, updated_at] = this.values
      this.db.orders.push({ id, order_number, customer_name, email, address, postal_code, region, items_json, subtotal, shipping, total, status: 'awaiting_payment', payment_provider: 'sandbox', payment_id: null, payment_status: 'not_started', created_at, updated_at })
      return { meta: { changes: 1 } }
    }
    if (this.sql.startsWith('UPDATE demo_orders SET status = ?, payment_provider')) {
      const [status, payment_provider, payment_id, payment_status, updated_at, orderNumber] = this.values
      const order = this.db.orders.find((item) => item.order_number === orderNumber)
      if (!order) return { meta: { changes: 0 } }
      Object.assign(order, { status, payment_provider, payment_id, payment_status, updated_at })
      return { meta: { changes: 1 } }
    }
    if (this.sql.startsWith('UPDATE demo_orders SET payment_provider')) {
      const [payment_provider, payment_id, payment_status, updated_at, orderNumber] = this.values
      const order = this.db.orders.find((item) => item.order_number === orderNumber)
      if (!order) return { meta: { changes: 0 } }
      Object.assign(order, { payment_provider, payment_id, payment_status, updated_at })
      return { meta: { changes: 1 } }
    }
    if (this.sql.startsWith('UPDATE demo_orders SET status = ?')) {
      const [status, updated_at, orderNumber] = this.values
      const order = this.db.orders.find((item) => item.order_number === orderNumber)
      if (!order) return { meta: { changes: 0 } }
      Object.assign(order, { status, updated_at })
      return { meta: { changes: 1 } }
    }
    if (this.sql.startsWith('INSERT OR IGNORE INTO newsletter_subscribers')) {
      const [id, email, source, created_at] = this.values
      if (!this.db.subscribers.some((item) => item.email === email)) this.db.subscribers.push({ id, email, source, created_at })
      return { meta: { changes: 1 } }
    }
    if (this.sql.startsWith('INSERT OR IGNORE INTO payment_events')) {
      const [id, event_key, order_number, provider, event_type, payment_id, status, payload_json, created_at] = this.values
      if (this.db.events.some((item) => item.event_key === event_key)) return { meta: { changes: 0 } }
      this.db.events.push({ id, event_key, order_number, provider, event_type, payment_id, status, payload_json, created_at })
      return { meta: { changes: 1 } }
    }
    throw new Error(`Unhandled run SQL: ${this.sql}`)
  }
  async first() {
    if (this.sql.startsWith('SELECT COUNT(*)')) return { count: this.db.subscribers.length }
    if (this.sql.startsWith('SELECT event_key FROM payment_events')) return this.db.events.find((item) => item.event_key === this.values[0]) ?? null
    if (this.sql.includes('FROM demo_orders WHERE order_number = ?')) return this.db.orders.find((item) => item.order_number === this.values[0]) ?? null
    throw new Error(`Unhandled first SQL: ${this.sql}`)
  }
  async all() {
    if (this.sql.includes('FROM demo_orders ORDER BY created_at DESC')) return { results: [...this.db.orders].sort((a, b) => b.created_at - a.created_at) }
    if (this.sql.includes('FROM payment_events ORDER BY created_at DESC')) return { results: [...this.db.events].sort((a, b) => b.created_at - a.created_at) }
    throw new Error(`Unhandled all SQL: ${this.sql}`)
  }
}

class FakeD1 {
  orders = []
  subscribers = []
  events = []
  prepare(sql) { return new FakeStatement(this, sql) }
  async batch(statements) { return Promise.all(statements.map((statement) => statement.run())) }
}

const env = { DB: new FakeD1(), ADMIN_ACCESS_KEY: 'test-admin-key' }
const call = (path, init) => worker.fetch(new Request(`https://lumbre.test${path}`, init), env)

let response = await call('/api/health')
assert.equal(response.status, 200)
assert.deepEqual(await response.json(), { ok: true, service: 'lumbre-store', persistence: true, payments: 'sandbox', webhooks: false, admin: true, version: 3 })

response = await call('/api/orders', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ customer: { name: 'Ada Lovelace', email: 'ada@example.com', address: 'Calle Fuego 123' }, postalCode: '1414', items: [{ productId: 1, quantity: 2 }] }) })
assert.equal(response.status, 201)
const created = await response.json()
assert.match(created.orderNumber, /^LUM-/)
assert.equal(created.status, 'awaiting_payment')

response = await call('/api/payments/session', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ orderNumber: created.orderNumber }) })
assert.equal(response.status, 200)
assert.equal((await response.json()).mode, 'sandbox')

response = await call('/api/payments/sandbox', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ orderNumber: created.orderNumber, outcome: 'approved' }) })
assert.equal(response.status, 200)
const payment = await response.json()
assert.equal(payment.paymentStatus, 'approved')
assert.equal(payment.orderStatus, 'paid')
assert.match(payment.paymentId, /^SBX-/)
assert.equal(env.DB.events.length, 1)

response = await call(`/api/orders/${created.orderNumber}`)
assert.equal(response.status, 200)
assert.equal((await response.json()).status, 'paid')

response = await call('/api/admin/session', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ key: 'incorrect' }) })
assert.equal(response.status, 401)
response = await call('/api/admin/session', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ key: env.ADMIN_ACCESS_KEY }) })
assert.equal(response.status, 200)
const { token } = await response.json()
assert.ok(token)

response = await call('/api/admin/orders', { headers: { authorization: `Bearer ${token}` } })
assert.equal(response.status, 200)
const adminData = await response.json()
assert.equal(adminData.orders[0].payment_status, 'approved')
assert.equal(adminData.events[0].event_type, 'payment.approved')

response = await call(`/api/admin/orders/${created.orderNumber}`, { method: 'PATCH', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify({ status: 'preparing' }) })
assert.equal(response.status, 200)
assert.equal(env.DB.orders[0].status, 'preparing')

response = await call('/admin', { headers: { accept: 'text/html' } })
assert.equal(response.status, 200)
const adminHtml = await response.text()
assert.match(adminHtml, /Panel de pedidos/)
assert.match(adminHtml, /noindex,nofollow/)

const liveEnv = { DB: new FakeD1(), ADMIN_ACCESS_KEY: 'test-admin-key', MERCADO_PAGO_ACCESS_TOKEN: 'TEST-token', MERCADO_PAGO_WEBHOOK_SECRET: 'webhook-secret' }
const liveCall = (path, init) => worker.fetch(new Request(`https://lumbre.test${path}`, init), liveEnv)
response = await liveCall('/api/orders', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ customer: { name: 'Grace Hopper', email: 'grace@example.com', address: 'Pasaje Origen 42' }, postalCode: '1414', items: [{ productId: 2, quantity: 1 }] }) })
const liveOrder = await response.json()
const originalFetch = globalThis.fetch
globalThis.fetch = async (url) => String(url).includes('/checkout/preferences')
  ? new Response(JSON.stringify({ id: 'PREF-123', init_point: 'https://www.mercadopago.com.ar/checkout/v1/redirect', sandbox_init_point: 'https://sandbox.mercadopago.com.ar/checkout/v1/redirect' }), { status: 201, headers: { 'content-type': 'application/json' } })
  : new Response(JSON.stringify({ external_reference: liveOrder.orderNumber, transaction_amount: liveEnv.DB.orders[0].total, currency_id: 'ARS', status: 'approved', status_detail: 'accredited' }), { status: 200, headers: { 'content-type': 'application/json' } })
try {
  response = await liveCall('/api/payments/session', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ orderNumber: liveOrder.orderNumber }) })
  assert.equal(response.status, 200)
  assert.equal((await response.json()).mode, 'mercado_pago')
  const timestamp = '1742505638683'
  const requestId = 'request-123'
  const dataId = '999999999'
  const manifest = `id:${dataId};request-id:${requestId};ts:${timestamp};`
  const signature = createHmac('sha256', liveEnv.MERCADO_PAGO_WEBHOOK_SECRET).update(manifest).digest('hex')
  const webhookInit = { method: 'POST', headers: { 'content-type': 'application/json', 'x-request-id': requestId, 'x-signature': `ts=${timestamp},v1=${signature}` }, body: JSON.stringify({ action: 'payment.updated', data: { id: dataId }, live_mode: false }) }
  response = await liveCall(`/api/payments/mercadopago/webhook?data.id=${dataId}&type=payment`, webhookInit)
  assert.equal(response.status, 200)
  assert.equal(liveEnv.DB.orders[0].status, 'paid')
  assert.equal(liveEnv.DB.events.length, 2)
  response = await liveCall(`/api/payments/mercadopago/webhook?data.id=${dataId}&type=payment`, webhookInit)
  assert.equal((await response.json()).duplicate, true)
  assert.equal(liveEnv.DB.events.length, 2)
} finally { globalThis.fetch = originalFetch }

console.log('Worker contract: checkout, provider adapter, signed webhook, idempotency and admin audit OK')
