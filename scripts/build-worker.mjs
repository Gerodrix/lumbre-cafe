import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { extname, join, relative, sep } from 'node:path'

const publicFiles = ['index.html', 'assets', 'images', 'videos', 'robots.txt', 'sitemap.xml']
const allowedExtensions = new Set(['.html', '.css', '.js', '.webp', '.png', '.mp4', '.txt', '.xml'])
const mimeTypes = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.webp': 'image/webp', '.png': 'image/png', '.mp4': 'video/mp4', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8',
}

async function collect(path) {
  const entries = await readdir(path, { withFileTypes: true })
  const files = await Promise.all(entries.map(async (entry) => {
    const entryPath = join(path, entry.name)
    return entry.isDirectory() ? collect(entryPath) : entryPath
  }))
  return files.flat()
}

const sourceFiles = []
for (const entry of publicFiles) {
  const path = join('dist', entry)
  if (entry.includes('.')) sourceFiles.push(path)
  else sourceFiles.push(...await collect(path))
}

const manifest = {}
for (const path of sourceFiles) {
  const extension = extname(path)
  if (!allowedExtensions.has(extension)) continue
  const urlPath = `/${relative('dist', path).split(sep).join('/')}`
  manifest[urlPath] = { body: (await readFile(path)).toString('base64'), type: mimeTypes[extension] }
}

const catalog = JSON.parse(await readFile('src/data/catalog.json', 'utf8'))
const worker = `const files = ${JSON.stringify(manifest)}
const catalog = ${JSON.stringify(catalog)}

function decode(value) {
  const binary = atob(value)
  return Uint8Array.from(binary, character => character.charCodeAt(0))
}

function responseHeaders(type, cacheControl = 'no-cache') {
  return {
    'content-type': type,
    'cache-control': cacheControl,
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'strict-origin-when-cross-origin',
    'permissions-policy': 'camera=(), microphone=(), geolocation=()',
    'content-security-policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://*.tile.openstreetmap.org; media-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: responseHeaders('application/json; charset=utf-8', 'no-store') })
}

function shippingQuote(postal) {
  const match = String(postal || '').toUpperCase().match(/\\d{4}/)
  if (!match) return null
  const code = Number(match[0])
  if (code < 2000) return { region: 'CABA y Gran Buenos Aires', price: 2800, eta: '1–2 días hábiles', center: [-34.61, -58.48], provider: 'Lumbre Shipping API' }
  if (code < 4000) return { region: 'Centro y Litoral', price: 4800, eta: '2–4 días hábiles', center: [-31.42, -64.19], provider: 'Lumbre Shipping API' }
  if (code < 6000) return { region: 'Norte y Cuyo', price: 5400, eta: '3–5 días hábiles', center: [-27.45, -65.0], provider: 'Lumbre Shipping API' }
  if (code < 8000) return { region: 'Provincia de Buenos Aires', price: 4900, eta: '2–4 días hábiles', center: [-36.5, -60.0], provider: 'Lumbre Shipping API' }
  return { region: 'Patagonia', price: 6900, eta: '4–7 días hábiles', center: [-41.13, -71.31], provider: 'Lumbre Shipping API' }
}

async function ensureDatabase(db) {
  if (!db) return false
  await db.batch([
    db.prepare(\`CREATE TABLE IF NOT EXISTS demo_orders (
      id TEXT PRIMARY KEY NOT NULL, order_number TEXT NOT NULL UNIQUE, customer_name TEXT NOT NULL, email TEXT NOT NULL,
      address TEXT NOT NULL, postal_code TEXT NOT NULL, region TEXT NOT NULL, items_json TEXT NOT NULL,
      subtotal INTEGER NOT NULL, shipping INTEGER NOT NULL, total INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'awaiting_payment', payment_provider TEXT NOT NULL DEFAULT 'sandbox', payment_id TEXT,
      payment_status TEXT NOT NULL DEFAULT 'not_started', created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
    )\`),
    db.prepare(\`CREATE TABLE IF NOT EXISTS newsletter_subscribers (
      id TEXT PRIMARY KEY NOT NULL, email TEXT NOT NULL UNIQUE, source TEXT NOT NULL DEFAULT 'landing_footer', created_at INTEGER NOT NULL
    )\`),
    db.prepare(\`CREATE TABLE IF NOT EXISTS payment_events (
      id TEXT PRIMARY KEY NOT NULL, event_key TEXT NOT NULL UNIQUE, order_number TEXT NOT NULL, provider TEXT NOT NULL,
      event_type TEXT NOT NULL, payment_id TEXT, status TEXT NOT NULL, payload_json TEXT NOT NULL, created_at INTEGER NOT NULL
    )\`),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_payment_events_order_created_at ON payment_events (order_number, created_at)'),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_payment_events_created_at ON payment_events (created_at)'),
  ])
  return true
}

function encodeBase64Url(bytes) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/=/g, '').replace(/\\+/g, '-').replace(/\\//g, '_')
}

function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(normalized + '='.repeat((4 - normalized.length % 4) % 4))
  return Uint8Array.from(binary, character => character.charCodeAt(0))
}

async function importAdminKey(secret, usage) {
  return crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [usage])
}

function hexToBytes(value) {
  if (!/^[a-f0-9]{64}$/i.test(value)) return null
  return Uint8Array.from(value.match(/.{2}/g), pair => Number.parseInt(pair, 16))
}

async function verifyMercadoPagoSignature(request, url, body, secret) {
  if (!secret) return false
  const dataId = String(url.searchParams.get('data.id') || url.searchParams.get('id') || body?.data?.id || '')
  const requestId = request.headers.get('x-request-id') || ''
  const parts = Object.fromEntries(String(request.headers.get('x-signature') || '').split(',').map(part => part.trim().split('=')))
  const signature = hexToBytes(parts.v1 || '')
  if (!dataId || !requestId || !parts.ts || !signature) return false
  const manifest = 'id:' + dataId + ';request-id:' + requestId + ';ts:' + parts.ts + ';'
  return crypto.subtle.verify('HMAC', await importAdminKey(secret, 'verify'), signature, new TextEncoder().encode(manifest))
}

function paymentOrderStatus(status) {
  if (status === 'approved') return 'paid'
  if (['rejected', 'cancelled', 'refunded', 'charged_back'].includes(status)) return status === 'rejected' ? 'payment_rejected' : 'cancelled'
  return 'awaiting_payment'
}

function paymentEventStatement(db, event) {
  return db.prepare(\`INSERT OR IGNORE INTO payment_events
    (id, event_key, order_number, provider, event_type, payment_id, status, payload_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)\`).bind(crypto.randomUUID(), event.eventKey, event.orderNumber, event.provider, event.eventType, event.paymentId || null, event.status, JSON.stringify(event.payload || {}), Math.floor(Date.now() / 1000))
}

async function createAdminToken(secret) {
  const payload = encodeBase64Url(new TextEncoder().encode(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 7200, scope: 'lumbre_admin' })))
  const signature = await crypto.subtle.sign('HMAC', await importAdminKey(secret, 'sign'), new TextEncoder().encode(payload))
  return payload + '.' + encodeBase64Url(new Uint8Array(signature))
}

async function isAdminRequest(request, secret) {
  if (!secret) return false
  const token = request.headers.get('authorization')?.replace(/^Bearer\\s+/i, '') || ''
  const [payload, signature] = token.split('.')
  if (!payload || !signature) return false
  try {
    const valid = await crypto.subtle.verify('HMAC', await importAdminKey(secret, 'verify'), decodeBase64Url(signature), new TextEncoder().encode(payload))
    if (!valid) return false
    const claims = JSON.parse(new TextDecoder().decode(decodeBase64Url(payload)))
    return claims.scope === 'lumbre_admin' && Number(claims.exp) > Math.floor(Date.now() / 1000)
  } catch { return false }
}

function parseOrder(row) {
  return { ...row, items: JSON.parse(row.items_json || '[]'), items_json: undefined }
}

async function readJson(request) {
  const length = Number(request.headers.get('content-length') || 0)
  if (length > 20000) throw new Error('payload_too_large')
  return request.json()
}

async function handleApi(request, url, env) {
  if (url.pathname === '/api/health' && request.method === 'GET') return json({ ok: true, service: 'lumbre-store', persistence: Boolean(env.DB), payments: env.MERCADO_PAGO_ACCESS_TOKEN ? 'mercado_pago' : 'sandbox', webhooks: Boolean(env.MERCADO_PAGO_WEBHOOK_SECRET), admin: Boolean(env.ADMIN_ACCESS_KEY), version: 3 })
  if (url.pathname === '/api/catalog' && request.method === 'GET') return json({ products: catalog.map(({ packshot, accent, movement, ...product }) => product), currency: 'ARS', updatedAt: '2026-09-01' })
  if (url.pathname === '/api/shipping/quote' && request.method === 'GET') {
    const quote = shippingQuote(url.searchParams.get('postal'))
    return quote ? json(quote) : json({ message: 'Código postal inválido' }, 400)
  }

  if (url.pathname === '/api/admin/session' && request.method === 'POST') {
    if (!env.ADMIN_ACCESS_KEY) return json({ message: 'Panel no configurado' }, 503)
    let body
    try { body = await readJson(request) } catch { return json({ message: 'Solicitud inválida' }, 400) }
    if (String(body?.key || '') !== env.ADMIN_ACCESS_KEY) return json({ message: 'Clave incorrecta' }, 401)
    return json({ token: await createAdminToken(env.ADMIN_ACCESS_KEY), expiresIn: 7200 })
  }

  if (url.pathname === '/api/admin/orders' && request.method === 'GET') {
    if (!await isAdminRequest(request, env.ADMIN_ACCESS_KEY)) return json({ message: 'Acceso no autorizado' }, 401)
    if (!await ensureDatabase(env.DB)) return json({ message: 'Persistencia no disponible' }, 503)
    const ordersResult = await env.DB.prepare(\`SELECT order_number, customer_name, email, address, postal_code, region, items_json,
      subtotal, shipping, total, status, payment_provider, payment_id, payment_status, created_at, updated_at
      FROM demo_orders ORDER BY created_at DESC LIMIT 100\`).all()
    const eventsResult = await env.DB.prepare(\`SELECT event_key, order_number, provider, event_type, payment_id, status, created_at
      FROM payment_events ORDER BY created_at DESC LIMIT 50\`).all()
    const subscribers = await env.DB.prepare('SELECT COUNT(*) AS count FROM newsletter_subscribers').first()
    return json({ orders: (ordersResult.results || []).map(parseOrder), events: eventsResult.results || [], subscribers: Number(subscribers?.count || 0), paymentMode: env.MERCADO_PAGO_ACCESS_TOKEN ? 'mercado_pago' : 'sandbox', webhooksConfigured: Boolean(env.MERCADO_PAGO_WEBHOOK_SECRET), provider: 'Lumbre Admin API' })
  }

  const adminOrderMatch = url.pathname.match(/^\\/api\\/admin\\/orders\\/([^/]+)$/)
  if (adminOrderMatch && request.method === 'PATCH') {
    if (!await isAdminRequest(request, env.ADMIN_ACCESS_KEY)) return json({ message: 'Acceso no autorizado' }, 401)
    if (!await ensureDatabase(env.DB)) return json({ message: 'Persistencia no disponible' }, 503)
    let body
    try { body = await readJson(request) } catch { return json({ message: 'Solicitud inválida' }, 400) }
    const allowed = ['awaiting_payment', 'payment_rejected', 'paid', 'preparing', 'shipped', 'cancelled']
    const status = String(body?.status || '')
    if (!allowed.includes(status)) return json({ message: 'Estado inválido' }, 400)
    const orderNumber = decodeURIComponent(adminOrderMatch[1])
    const result = await env.DB.prepare('UPDATE demo_orders SET status = ?, updated_at = ? WHERE order_number = ?').bind(status, Math.floor(Date.now() / 1000), orderNumber).run()
    if (!result.meta?.changes) return json({ message: 'Pedido no encontrado' }, 404)
    return json({ orderNumber, status })
  }

  if (url.pathname === '/api/orders' && request.method === 'POST') {
    if (!await ensureDatabase(env.DB)) return json({ message: 'Persistencia no disponible' }, 503)
    let body
    try { body = await readJson(request) } catch { return json({ message: 'Solicitud inválida' }, 400) }
    const customer = body?.customer || {}
    const email = String(customer.email || '').trim().toLowerCase()
    const name = String(customer.name || '').trim()
    const address = String(customer.address || '').trim()
    const quote = shippingQuote(body?.postalCode)
    if (!quote || name.length < 2 || name.length > 80 || address.length < 4 || address.length > 180 || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) return json({ message: 'Datos de pedido inválidos' }, 400)
    if (!Array.isArray(body.items) || !body.items.length || body.items.length > 10) return json({ message: 'La bolsa está vacía' }, 400)

    const normalizedItems = []
    let subtotal = 0
    for (const item of body.items) {
      const product = catalog.find(candidate => candidate.id === Number(item.productId))
      const quantity = Number(item.quantity)
      if (!product || !Number.isInteger(quantity) || quantity < 1 || quantity > 10) return json({ message: 'Producto o cantidad inválida' }, 400)
      subtotal += product.priceValue * quantity
      normalizedItems.push({ productId: product.id, sku: product.sku, name: product.name, quantity, unitPrice: product.priceValue })
    }

    const id = crypto.randomUUID()
    const orderNumber = 'LUM-' + Date.now().toString(36).slice(-6).toUpperCase()
    const total = subtotal + quote.price
    const now = Math.floor(Date.now() / 1000)
    await env.DB.prepare(\`INSERT INTO demo_orders (id, order_number, customer_name, email, address, postal_code, region, items_json, subtotal, shipping, total, status, payment_provider, payment_status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'awaiting_payment', 'sandbox', 'not_started', ?, ?)\`).bind(id, orderNumber, name, email, address, String(body.postalCode).toUpperCase(), quote.region, JSON.stringify(normalizedItems), subtotal, quote.price, total, now, now).run()
    return json({ orderNumber, status: 'awaiting_payment', paymentStatus: 'not_started', subtotal, shipping: quote.price, total, eta: quote.eta }, 201)
  }

  if (url.pathname === '/api/payments/session' && request.method === 'POST') {
    if (!await ensureDatabase(env.DB)) return json({ message: 'Persistencia no disponible' }, 503)
    let body
    try { body = await readJson(request) } catch { return json({ message: 'Solicitud inválida' }, 400) }
    const orderNumber = String(body?.orderNumber || '').trim().toUpperCase()
    if (!/^LUM-[A-Z0-9]+$/.test(orderNumber)) return json({ message: 'Pedido inválido' }, 400)
    const order = await env.DB.prepare('SELECT order_number, email, items_json, shipping, total, status, payment_id, payment_status FROM demo_orders WHERE order_number = ?').bind(orderNumber).first()
    if (!order) return json({ message: 'Pedido no encontrado' }, 404)
    if (order.payment_status === 'approved') return json({ mode: order.payment_provider, orderNumber, paymentStatus: 'approved', paymentId: order.payment_id })
    if (!env.MERCADO_PAGO_ACCESS_TOKEN) return json({ mode: 'sandbox', provider: 'Lumbre Sandbox Pay', webhookConfigured: false })

    const items = JSON.parse(order.items_json || '[]').map(item => ({ id: item.sku, title: item.name, quantity: item.quantity, currency_id: 'ARS', unit_price: item.unitPrice }))
    if (order.shipping > 0) items.push({ id: 'LUM-ENVIO', title: 'Envío Lumbre', quantity: 1, currency_id: 'ARS', unit_price: order.shipping })
    const preferenceResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: { authorization: 'Bearer ' + env.MERCADO_PAGO_ACCESS_TOKEN, 'content-type': 'application/json', 'x-idempotency-key': 'lumbre-' + orderNumber },
      body: JSON.stringify({
        items,
        payer: { email: order.email },
        external_reference: orderNumber,
        back_urls: {
          success: url.origin + '/?checkout=approved&order=' + encodeURIComponent(orderNumber),
          pending: url.origin + '/?checkout=pending&order=' + encodeURIComponent(orderNumber),
          failure: url.origin + '/?checkout=rejected&order=' + encodeURIComponent(orderNumber),
        },
        notification_url: url.origin + '/api/payments/mercadopago/webhook',
        auto_return: 'approved',
      }),
    })
    if (!preferenceResponse.ok) return json({ message: 'El proveedor de pagos no pudo iniciar el checkout' }, 502)
    const preference = await preferenceResponse.json()
    if (!preference?.id || !preference?.init_point) return json({ message: 'Respuesta de pago incompleta' }, 502)
    const checkoutUrl = String(env.MERCADO_PAGO_ACCESS_TOKEN).startsWith('TEST-') && preference.sandbox_init_point ? String(preference.sandbox_init_point) : String(preference.init_point)
    const now = Math.floor(Date.now() / 1000)
    await env.DB.batch([
      env.DB.prepare('UPDATE demo_orders SET payment_provider = ?, payment_id = ?, payment_status = ?, updated_at = ? WHERE order_number = ?').bind('mercado_pago', String(preference.id), 'preference_created', now, orderNumber),
      paymentEventStatement(env.DB, { eventKey: 'mercadopago:preference:' + preference.id, orderNumber, provider: 'mercado_pago', eventType: 'preference.created', paymentId: String(preference.id), status: 'preference_created', payload: { sandbox: Boolean(preference.sandbox_init_point) } }),
    ])
    return json({ mode: 'mercado_pago', provider: 'Mercado Pago Checkout Pro', orderNumber, preferenceId: String(preference.id), checkoutUrl, testMode: String(env.MERCADO_PAGO_ACCESS_TOKEN).startsWith('TEST-'), webhookConfigured: Boolean(env.MERCADO_PAGO_WEBHOOK_SECRET) })
  }

  if (url.pathname === '/api/payments/mercadopago/webhook' && request.method === 'POST') {
    if (!env.MERCADO_PAGO_ACCESS_TOKEN || !env.MERCADO_PAGO_WEBHOOK_SECRET) return json({ message: 'Webhook no configurado' }, 503)
    if (!await ensureDatabase(env.DB)) return json({ message: 'Persistencia no disponible' }, 503)
    let body
    try { body = await readJson(request) } catch { return json({ message: 'Solicitud inválida' }, 400) }
    if (!await verifyMercadoPagoSignature(request, url, body, env.MERCADO_PAGO_WEBHOOK_SECRET)) return json({ message: 'Firma inválida' }, 401)
    const dataId = String(url.searchParams.get('data.id') || url.searchParams.get('id') || body?.data?.id || '')
    const signatureParts = Object.fromEntries(String(request.headers.get('x-signature') || '').split(',').map(part => part.trim().split('=')))
    const eventKey = 'mercadopago:' + String(body?.action || 'payment.updated') + ':' + dataId + ':' + String(signatureParts.ts || '')
    const previous = await env.DB.prepare('SELECT event_key FROM payment_events WHERE event_key = ?').bind(eventKey).first()
    if (previous) return json({ ok: true, duplicate: true })

    const paymentResponse = await fetch('https://api.mercadopago.com/v1/payments/' + encodeURIComponent(dataId), { headers: { authorization: 'Bearer ' + env.MERCADO_PAGO_ACCESS_TOKEN } })
    if (!paymentResponse.ok) return json({ message: 'No se pudo verificar el pago' }, 502)
    const payment = await paymentResponse.json()
    const orderNumber = String(payment?.external_reference || '').toUpperCase()
    const order = await env.DB.prepare('SELECT order_number, total FROM demo_orders WHERE order_number = ?').bind(orderNumber).first()
    const amountMatches = order && Number(payment?.transaction_amount) === Number(order.total) && payment?.currency_id === 'ARS'
    if (!amountMatches) {
      await paymentEventStatement(env.DB, { eventKey, orderNumber: orderNumber || 'UNMATCHED', provider: 'mercado_pago', eventType: String(body?.action || 'payment.updated'), paymentId: dataId, status: 'validation_failed', payload: { currency: payment?.currency_id, amount: payment?.transaction_amount } }).run()
      return json({ ok: true, ignored: 'validation_failed' })
    }

    const paymentStatus = String(payment.status || 'pending')
    const orderStatus = paymentOrderStatus(paymentStatus)
    const now = Math.floor(Date.now() / 1000)
    await env.DB.batch([
      env.DB.prepare('UPDATE demo_orders SET status = ?, payment_provider = ?, payment_id = ?, payment_status = ?, updated_at = ? WHERE order_number = ?').bind(orderStatus, 'mercado_pago', dataId, paymentStatus, now, orderNumber),
      paymentEventStatement(env.DB, { eventKey, orderNumber, provider: 'mercado_pago', eventType: String(body?.action || 'payment.updated'), paymentId: dataId, status: paymentStatus, payload: { liveMode: Boolean(body?.live_mode), statusDetail: payment?.status_detail || null, amount: payment.transaction_amount, currency: payment.currency_id } }),
    ])
    return json({ ok: true })
  }

  if (url.pathname === '/api/payments/sandbox' && request.method === 'POST') {
    if (!await ensureDatabase(env.DB)) return json({ message: 'Persistencia no disponible' }, 503)
    let body
    try { body = await readJson(request) } catch { return json({ message: 'Solicitud inválida' }, 400) }
    const orderNumber = String(body?.orderNumber || '').trim().toUpperCase()
    const outcome = String(body?.outcome || '')
    if (!/^LUM-[A-Z0-9]+$/.test(orderNumber) || !['approved', 'pending', 'rejected'].includes(outcome)) return json({ message: 'Simulación inválida' }, 400)
    const order = await env.DB.prepare('SELECT order_number, total, status, payment_id, payment_status FROM demo_orders WHERE order_number = ?').bind(orderNumber).first()
    if (!order) return json({ message: 'Pedido no encontrado' }, 404)
    if (order.payment_status === 'approved') return json({ orderNumber, paymentId: order.payment_id, paymentStatus: 'approved', orderStatus: order.status, total: order.total, provider: 'Lumbre Sandbox Pay' })
    const paymentId = 'SBX-' + crypto.randomUUID().slice(0, 8).toUpperCase()
    const orderStatus = outcome === 'approved' ? 'paid' : outcome === 'rejected' ? 'payment_rejected' : 'awaiting_payment'
    await env.DB.batch([
      env.DB.prepare('UPDATE demo_orders SET status = ?, payment_provider = ?, payment_id = ?, payment_status = ?, updated_at = ? WHERE order_number = ?').bind(orderStatus, 'sandbox', paymentId, outcome, Math.floor(Date.now() / 1000), orderNumber),
      paymentEventStatement(env.DB, { eventKey: 'sandbox:payment:' + paymentId, orderNumber, provider: 'sandbox', eventType: 'payment.' + outcome, paymentId, status: outcome, payload: { source: 'interactive_demo' } }),
    ])
    return json({ orderNumber, paymentId, paymentStatus: outcome, orderStatus, total: order.total, provider: 'Lumbre Sandbox Pay' })
  }

  const orderStatusMatch = url.pathname.match(/^\\/api\\/orders\\/(LUM-[A-Z0-9]+)$/)
  if (orderStatusMatch && request.method === 'GET') {
    if (!await ensureDatabase(env.DB)) return json({ message: 'Persistencia no disponible' }, 503)
    const order = await env.DB.prepare('SELECT order_number, total, status, payment_provider, payment_id, payment_status, created_at, updated_at FROM demo_orders WHERE order_number = ?').bind(orderStatusMatch[1]).first()
    return order ? json(order) : json({ message: 'Pedido no encontrado' }, 404)
  }

  if (url.pathname === '/api/newsletter' && request.method === 'POST') {
    if (!await ensureDatabase(env.DB)) return json({ message: 'Persistencia no disponible' }, 503)
    let body
    try { body = await readJson(request) } catch { return json({ message: 'Solicitud inválida' }, 400) }
    const email = String(body?.email || '').trim().toLowerCase()
    if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email) || email.length > 160) return json({ message: 'Email inválido' }, 400)
    await env.DB.prepare('INSERT OR IGNORE INTO newsletter_subscribers (id, email, source, created_at) VALUES (?, ?, ?, ?)').bind(crypto.randomUUID(), email, 'landing_footer', Math.floor(Date.now() / 1000)).run()
    return json({ ok: true, message: 'Suscripción registrada' }, 201)
  }

  return json({ message: 'Endpoint no encontrado' }, 404)
}

function escapeHtml(value) {
  return String(value).replace(/[&<>\"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;' })[character])
}

function renderHtml(pathname, siteOrigin) {
  const product = pathname.startsWith('/cafes/') ? catalog.find(item => '/cafes/' + item.slug === pathname) : null
  const isPrivacy = pathname === '/privacidad'
  const isProject = pathname === '/proyecto'
  const isAdmin = pathname === '/admin'
  const isKnown = pathname === '/' || Boolean(product) || isPrivacy || isProject || isAdmin
  const title = product ? product.name + ' — Café de origen | Lumbre Café' : isAdmin ? 'Panel de pedidos | Lumbre Café' : isProject ? 'Caso de estudio — E-commerce Lumbre Café' : isPrivacy ? 'Privacidad y datos | Lumbre Café' : 'Lumbre Café — Café de especialidad'
  const description = product ? product.description : isAdmin ? 'Panel privado de demostración para gestionar pedidos y estados de pago.' : isProject ? 'Caso de estudio full-stack: dirección de arte, e-commerce, APIs, persistencia, accesibilidad y SEO técnico.' : isPrivacy ? 'Información sobre el uso de datos en la demostración de e-commerce Lumbre Café.' : 'Cafés de origen tostados en pequeños lotes en Buenos Aires. Una invitación a preparar el día con más calma.'
  const canonical = siteOrigin + (isKnown ? pathname : '/')
  const image = siteOrigin + (product ? product.image : '/images/lumbre-hero.webp')
  const structured = product ? {
    '@context': 'https://schema.org', '@type': 'Product', name: product.name, sku: product.sku, image, description: product.description,
    brand: { '@type': 'Brand', name: 'Lumbre Café' },
    offers: { '@type': 'Offer', url: canonical, priceCurrency: 'ARS', price: product.priceValue, availability: 'https://schema.org/InStock', itemCondition: 'https://schema.org/NewCondition' },
  } : isProject ? {
    '@context': 'https://schema.org', '@type': 'CreativeWork', name: 'Lumbre Café — Caso de estudio de e-commerce', url: canonical,
    description, inLanguage: 'es-AR', creator: { '@type': 'Organization', name: 'Lumbre Café' }, image,
  } : {
    '@context': 'https://schema.org', '@graph': [
      { '@type': 'Organization', '@id': siteOrigin + '/#organization', name: 'Lumbre Café', url: siteOrigin, logo: siteOrigin + '/images/lumbre-pouch-quebrada-v2.webp', email: 'hola@lumbrecafe.ar' },
      { '@type': 'WebSite', '@id': siteOrigin + '/#website', name: 'Lumbre Café', url: siteOrigin, inLanguage: 'es-AR', publisher: { '@id': siteOrigin + '/#organization' } },
      { '@type': 'ItemList', name: 'Cafés de temporada', itemListElement: catalog.map((item, index) => ({ '@type': 'ListItem', position: index + 1, url: siteOrigin + '/cafes/' + item.slug, name: item.name })) },
    ],
  }

  let html = new TextDecoder().decode(decode(files['/index.html'].body))
  html = html.replace(/<title>[^<]*<\\/title>/, '<title>' + escapeHtml(title) + '</title>')
  html = html.replace(/<meta name="description"[^>]*>/, '<meta name="description" content="' + escapeHtml(description) + '">')
  html = html.replace(/<meta property="og:title"[^>]*>/, '<meta property="og:title" content="' + escapeHtml(title) + '">')
  html = html.replace(/<meta property="og:description"[^>]*>/, '<meta property="og:description" content="' + escapeHtml(description) + '">')
  html = html.replace(/<meta property="og:url"[^>]*>/, '<meta property="og:url" content="' + escapeHtml(canonical) + '">')
  html = html.replace(/<meta property="og:image"[^>]*>/, '<meta property="og:image" content="' + escapeHtml(image) + '">')
  html = html.replace(/<meta name="twitter:title"[^>]*>/, '<meta name="twitter:title" content="' + escapeHtml(title) + '">')
  html = html.replace(/<meta name="twitter:description"[^>]*>/, '<meta name="twitter:description" content="' + escapeHtml(description) + '">')
  html = html.replace(/<meta name="twitter:image"[^>]*>/, '<meta name="twitter:image" content="' + escapeHtml(image) + '">')
  html = html.replace('</head>', '<link rel="canonical" href="' + escapeHtml(canonical) + '"><script id="structured-data" type="application/ld+json">' + JSON.stringify(structured).replace(/</g, '\\u003c') + '</script></head>')
  if (!isKnown || isAdmin) html = html.replace('</head>', '<meta name="robots" content="noindex,nofollow"></head>')
  return { html, status: isKnown ? 200 : 404 }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (url.pathname.startsWith('/api/')) return handleApi(request, url, env)
    const acceptsHtml = request.headers.get('accept')?.includes('text/html')
    const asset = files[url.pathname]

    if (asset) {
      const immutable = url.pathname.startsWith('/assets/') || /\\.(webp|png|mp4)$/.test(url.pathname)
      return new Response(decode(asset.body), { headers: responseHeaders(asset.type, immutable ? 'public, max-age=31536000, immutable' : 'no-cache') })
    }

    if (acceptsHtml) {
      const rendered = renderHtml(url.pathname.replace(/\\/$/, '') || '/', url.origin)
      return new Response(rendered.html, { status: rendered.status, headers: responseHeaders('text/html; charset=utf-8') })
    }

    return new Response('Not found', { status: 404, headers: responseHeaders('text/plain; charset=utf-8') })
  }
}
`

await mkdir('dist/server', { recursive: true })
await writeFile('dist/server/index.js', worker)
