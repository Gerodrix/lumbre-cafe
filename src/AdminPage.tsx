import { Activity, ArrowLeft, ArrowRight, Database, Flame, KeyRound, LogOut, PackageCheck, RefreshCw, Search, ShieldCheck, ShoppingBag, Truck, Webhook } from 'lucide-react'
import { FormEvent, useMemo, useState } from 'react'

type OrderItem = { productId: number; sku: string; name: string; quantity: number; unitPrice: number }
type AdminOrder = {
  order_number: string
  customer_name: string
  email: string
  address: string
  postal_code: string
  region: string
  items: OrderItem[]
  subtotal: number
  shipping: number
  total: number
  status: string
  payment_provider: string
  payment_id: string | null
  payment_status: string
  created_at: number
  updated_at: number
}
type PaymentEvent = { event_key: string; order_number: string; provider: string; event_type: string; payment_id: string | null; status: string; created_at: number }

const statuses = ['awaiting_payment', 'payment_rejected', 'paid', 'preparing', 'shipped', 'cancelled'] as const
const statusLabels: Record<string, string> = {
  awaiting_payment: 'Esperando pago', payment_rejected: 'Pago rechazado', paid: 'Pagado', preparing: 'Preparando', shipped: 'Enviado', cancelled: 'Cancelado',
}
const paymentStatusLabels: Record<string, string> = { approved: 'Aprobado', rejected: 'Rechazado', pending: 'Pendiente', in_process: 'En proceso', preference_created: 'Checkout iniciado', cancelled: 'Cancelado', refunded: 'Reembolsado', charged_back: 'Contracargo', not_started: 'Sin iniciar' }

function AdminWordmark() {
  return <a className="wordmark" href="/#inicio" aria-label="Lumbre Café, inicio"><span className="brand-mark" aria-hidden="true"><Flame size={14} strokeWidth={1.4} /></span><span>Lumbre <small>café</small></span></a>
}

export function AdminPage() {
  const [accessKey, setAccessKey] = useState('')
  const [token, setToken] = useState('')
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [subscribers, setSubscribers] = useState(0)
  const [events, setEvents] = useState<PaymentEvent[]>([])
  const [paymentMode, setPaymentMode] = useState<'sandbox' | 'mercado_pago'>('sandbox')
  const [webhooksConfigured, setWebhooksConfigured] = useState(false)
  const [loginState, setLoginState] = useState<'idle' | 'loading' | 'error'>('idle')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [updating, setUpdating] = useState('')

  const loadOrders = async (sessionToken: string) => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/admin/orders', { headers: { authorization: `Bearer ${sessionToken}` } })
      if (!response.ok) throw new Error('orders_failed')
      const data = await response.json() as { orders: AdminOrder[]; events: PaymentEvent[]; subscribers: number; paymentMode: 'sandbox' | 'mercado_pago'; webhooksConfigured: boolean }
      setOrders(data.orders)
      setEvents(data.events)
      setSubscribers(data.subscribers)
      setPaymentMode(data.paymentMode)
      setWebhooksConfigured(data.webhooksConfigured)
    } catch {
      setError('No pudimos cargar los pedidos. La sesión puede haber vencido.')
    } finally { setLoading(false) }
  }

  const login = async (event: FormEvent) => {
    event.preventDefault()
    setLoginState('loading')
    try {
      const response = await fetch('/api/admin/session', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ key: accessKey }) })
      const data = await response.json() as { token?: string }
      if (!response.ok || !data.token) throw new Error('login_failed')
      setToken(data.token)
      setAccessKey('')
      setLoginState('idle')
      await loadOrders(data.token)
    } catch { setLoginState('error') }
  }

  const updateStatus = async (orderNumber: string, status: string) => {
    setUpdating(orderNumber)
    setError('')
    try {
      const response = await fetch(`/api/admin/orders/${encodeURIComponent(orderNumber)}`, { method: 'PATCH', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify({ status }) })
      if (!response.ok) throw new Error('update_failed')
      setOrders((current) => current.map((order) => order.order_number === orderNumber ? { ...order, status, updated_at: Math.floor(Date.now() / 1000) } : order))
    } catch { setError('No pudimos actualizar el estado del pedido.') }
    finally { setUpdating('') }
  }

  const visibleOrders = useMemo(() => orders.filter((order) => {
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter
    const needle = query.trim().toLowerCase()
    const matchesQuery = !needle || `${order.order_number} ${order.customer_name} ${order.email}`.toLowerCase().includes(needle)
    return matchesStatus && matchesQuery
  }), [orders, query, statusFilter])

  const paidOrders = orders.filter((order) => ['paid', 'preparing', 'shipped'].includes(order.status))
  const paidTotal = paidOrders.reduce((total, order) => total + order.total, 0)

  if (!token) return (
    <main className="admin-page admin-login-page">
      <header className="product-nav"><AdminWordmark /><a className="product-back" href="/proyecto"><ArrowLeft /> Caso de estudio</a></header>
      <section className="admin-login">
        <div className="admin-login-copy"><p className="eyebrow">Backoffice · Acceso protegido</p><h1>La trastienda<br />de <em>Lumbre.</em></h1><p>Panel demostrativo para revisar pedidos, pagos sandbox y estados de preparación. Toda la información pertenece a pruebas.</p></div>
        <form onSubmit={login} className="admin-login-card">
          <div className="admin-login-icon"><KeyRound /></div><span>Sesión administrativa</span><h2>Ingresar al panel</h2>
          <label htmlFor="admin-key">Clave de demostración<input id="admin-key" name="adminKey" type="password" autoComplete="current-password" required value={accessKey} onChange={(event) => setAccessKey(event.target.value)} placeholder="••••••••••••" /></label>
          <button className="button button-copper" disabled={loginState === 'loading'}>{loginState === 'loading' ? 'Verificando…' : <>Abrir panel <ArrowRight /></>}</button>
          {loginState === 'error' && <p className="field-error" role="alert">La clave no es correcta o el panel todavía no está configurado.</p>}
          <small><ShieldCheck /> La clave se usa para crear una sesión temporal y no se guarda en el navegador.</small>
        </form>
      </section>
    </main>
  )

  return (
    <main className="admin-page">
      <header className="admin-header"><AdminWordmark /><div><span className="admin-live"><i /> {paymentMode === 'mercado_pago' ? 'Mercado Pago activo' : 'Sandbox activo'}</span><button onClick={() => { setToken(''); setOrders([]); setEvents([]) }}><LogOut /> Cerrar sesión</button></div></header>
      <section className="admin-shell">
        <div className="admin-heading"><div><p className="eyebrow">Panel de operaciones</p><h1>Pedidos.</h1><p>Seguimiento del checkout de muestra y su ciclo de preparación.</p></div><button className="admin-refresh" onClick={() => loadOrders(token)} disabled={loading}><RefreshCw className={loading ? 'is-spinning' : ''} /> Actualizar</button></div>

        <div className="admin-metrics">
          <article><ShoppingBag /><span>Pedidos</span><strong>{orders.length.toString().padStart(2, '0')}</strong><small>registrados en D1</small></article>
          <article><PackageCheck /><span>Pagados</span><strong>{paidOrders.length.toString().padStart(2, '0')}</strong><small>sandbox aprobado</small></article>
          <article><Database /><span>Volumen demo</span><strong>${paidTotal.toLocaleString('es-AR')}</strong><small>sin dinero real</small></article>
          <article><Activity /><span>Newsletter</span><strong>{subscribers.toString().padStart(2, '0')}</strong><small>suscripciones guardadas</small></article>
        </div>

        <section className="admin-integration" aria-label="Estado de la integración de pagos">
          <div><Webhook /><span>Proveedor de pagos</span><h2>{paymentMode === 'mercado_pago' ? 'Mercado Pago Checkout Pro' : 'Lumbre Sandbox Pay'}</h2><p>{paymentMode === 'mercado_pago' ? 'Preferencias, retorno y conciliación conectados.' : 'El adaptador real está preparado y la demo conserva su proveedor seguro.'}</p></div>
          <dl><div><dt>Checkout</dt><dd className="is-ready">{paymentMode === 'mercado_pago' ? 'Conectado' : 'Sandbox'}</dd></div><div><dt>Webhook firmado</dt><dd className={webhooksConfigured ? 'is-ready' : ''}>{webhooksConfigured ? 'Configurado' : 'Listo para credenciales'}</dd></div><div><dt>Eventos persistidos</dt><dd>{events.length}</dd></div></dl>
        </section>

        <div className="admin-toolbar">
          <label><Search /><span className="sr-only">Buscar pedidos</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por pedido, nombre o email" /></label>
          <label><span className="sr-only">Filtrar por estado</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">Todos los estados</option>{statuses.map((status) => <option value={status} key={status}>{statusLabels[status]}</option>)}</select></label>
        </div>

        {error && <p className="admin-error" role="alert">{error}</p>}
        <div className="admin-orders" aria-live="polite">
          {loading && !orders.length ? <div className="admin-empty"><RefreshCw className="is-spinning" /><h2>Cargando pedidos…</h2></div> : visibleOrders.length === 0 ? <div className="admin-empty"><Truck /><h2>No hay pedidos en esta vista.</h2><p>Cuando se complete el checkout sandbox aparecerán acá.</p></div> : visibleOrders.map((order) => (
            <article className="admin-order" key={order.order_number}>
              <header><div><span>{new Date(order.created_at * 1000).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}</span><h2>{order.order_number}</h2></div><strong className={`order-status order-status-${order.status}`}>{statusLabels[order.status] ?? order.status}</strong></header>
              <div className="admin-order-grid">
                <div><span>Cliente de prueba</span><strong>{order.customer_name}</strong><small>{order.email}<br />{order.address} · CP {order.postal_code}</small></div>
                <div><span>Productos</span>{order.items.map((item) => <strong key={item.sku}>{item.quantity} × {item.name}</strong>)}</div>
                <div><span>Pago</span><strong>{paymentStatusLabels[order.payment_status] ?? order.payment_status}</strong><small>{order.payment_id ?? 'Sin identificador'}<br />{order.payment_provider === 'mercado_pago' ? 'Mercado Pago' : 'Lumbre Sandbox Pay'}</small></div>
                <div><span>Total</span><strong>${order.total.toLocaleString('es-AR')}</strong><small>{order.region}</small></div>
              </div>
              <footer><label>Estado operativo<select value={statuses.includes(order.status as typeof statuses[number]) ? order.status : 'awaiting_payment'} onChange={(event) => updateStatus(order.order_number, event.target.value)} disabled={updating === order.order_number}>{statuses.map((status) => <option value={status} key={status}>{statusLabels[status]}</option>)}</select></label>{updating === order.order_number && <span><RefreshCw className="is-spinning" /> Guardando</span>}</footer>
            </article>
          ))}
        </div>

        <section className="admin-event-log">
          <div><p className="eyebrow">Auditoría de pagos</p><h2>Eventos recientes.</h2><p>Cada transición queda registrada con una clave idempotente para evitar procesar dos veces la misma notificación.</p></div>
          <div className="admin-events">{events.length === 0 ? <div className="admin-event-empty"><Activity /> Todavía no hay eventos de pago.</div> : events.slice(0, 12).map((event) => <article key={event.event_key}><i className={`event-dot event-${event.status}`} /><div><strong>{event.event_type.replaceAll('.', ' · ')}</strong><span>{event.order_number} · {event.provider === 'mercado_pago' ? 'Mercado Pago' : 'Sandbox'}</span></div><time dateTime={new Date(event.created_at * 1000).toISOString()}>{new Date(event.created_at * 1000).toLocaleString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</time></article>)}</div>
        </section>
      </section>
    </main>
  )
}
