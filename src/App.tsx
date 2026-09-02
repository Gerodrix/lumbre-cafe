import { AnimatePresence, motion, useInView, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion'
import {
  ArrowDown,
  ArrowRight,
  Check,
  ChevronDown,
  CircleAlert,
  Clock3,
  CreditCard,
  Flame,
  AtSign,
  Menu,
  Minus,
  Pause,
  Play,
  Plus,
  ShoppingBag,
  ShieldCheck,
  Sparkles,
  Truck,
  X,
} from 'lucide-react'
import { FormEvent, KeyboardEvent, lazy, ReactNode, Suspense, useEffect, useRef, useState } from 'react'
import { Product, products } from './catalog'

const ShippingMap = lazy(() => import('./ShippingMap'))

type ShippingQuote = { region: string; price: number; eta: string; center: [number, number]; provider?: string }

function estimateShipping(postal: string): ShippingQuote | null {
  const match = postal.match(/\d{4}/)
  if (!match) return null
  const code = Number(match[0])
  if (code < 2000) return { region: 'CABA y Gran Buenos Aires', price: 2800, eta: '1–2 días hábiles', center: [-34.61, -58.48] }
  if (code < 4000) return { region: 'Centro y Litoral', price: 4800, eta: '2–4 días hábiles', center: [-31.42, -64.19] }
  if (code < 6000) return { region: 'Norte y Cuyo', price: 5400, eta: '3–5 días hábiles', center: [-27.45, -65.0] }
  if (code < 8000) return { region: 'Provincia de Buenos Aires', price: 4900, eta: '2–4 días hábiles', center: [-36.5, -60.0] }
  return { region: 'Patagonia', price: 6900, eta: '4–7 días hábiles', center: [-41.13, -71.31] }
}

const rituals = [
  { step: '01', title: 'Moler', copy: 'Justo antes de preparar. Una textura media, parecida a la sal marina.', video: '/videos/ritual-grind.mp4', frame: 'Grano · textura media' },
  { step: '02', title: 'Calentar', copy: 'Agua entre 92 y 94 °C. Sin hervir, para cuidar cada nota del origen.', video: '/videos/ritual-heat.mp4', frame: 'Agua · 92 a 94 °C' },
  { step: '03', title: 'Despertar', copy: 'Humedecé todo el café y esperá 30 segundos. El aroma empieza acá.', video: '/videos/ritual-bloom.mp4', frame: 'Bloom · 30 segundos' },
  { step: '04', title: 'Pausar', copy: 'Verté lento, en círculos. Tres minutos para volver a estar presente.', video: '/videos/ritual-pour.mp4', frame: 'Vertido · pulso lento' },
]

function Reveal({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 36, filter: 'blur(7px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, amount: 0.18 }}
      transition={{ duration: 0.88, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

function Brand({ dark = false }: { dark?: boolean }) {
  return (
    <a className={`wordmark ${dark ? 'wordmark-dark' : ''}`} href="#inicio" aria-label="Lumbre Café, inicio">
      <span className="brand-mark" aria-hidden="true"><Flame size={14} strokeWidth={1.4} /></span>
      <span>Lumbre <small>café</small></span>
    </a>
  )
}

function SectionHeading({ eyebrow, children, copy }: { eyebrow: string; children: ReactNode; copy?: string }) {
  return (
    <div className="section-heading">
      <p className="eyebrow">{eyebrow}</p>
      <h2>{children}</h2>
      {copy && <p className="section-copy">{copy}</p>}
    </div>
  )
}

function SiteProgress() {
  const { scrollYProgress } = useScroll()
  const progress = useSpring(scrollYProgress, { stiffness: 95, damping: 24, mass: .25 })
  return <motion.div className="site-scroll-progress" style={{ scaleX: progress }} aria-hidden="true" />
}

function RitualVideo({ step, playing, restartKey }: { step: number; playing: boolean; restartKey: number }) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.currentTime = 0
    if (playing) void video.play().catch(() => undefined)
  }, [step, restartKey])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (playing) void video.play().catch(() => undefined)
    else video.pause()
  }, [playing])

  return (
    <div className={`ritual-film ritual-film-${step}`} aria-hidden="true">
      <video ref={videoRef} key={rituals[step].video} src={rituals[step].video} muted loop playsInline preload="metadata" autoPlay={playing} poster="/images/lumbre-brew.webp" />
      <span className="ritual-film-shade" />
      <span className="ritual-film-live"><i /> En movimiento</span>
      <span className="ritual-film-frame">{rituals[step].frame}</span>
    </div>
  )
}

const campaignMotion = {
  reveal: { initial: { clipPath: 'inset(100% 0 0 0)', scale: 1.08 }, animate: { clipPath: 'inset(0% 0 0 0)', scale: 1 }, exit: { clipPath: 'inset(0 0 100% 0)', scale: 1.04 } },
  drift: { initial: { opacity: 0, x: 90, scale: 1.12 }, animate: { opacity: 1, x: 0, scale: 1.04 }, exit: { opacity: 0, x: -70, scale: 1.08 } },
  mist: { initial: { opacity: 0, filter: 'blur(24px)', scale: 1.18 }, animate: { opacity: 1, filter: 'blur(0px)', scale: 1.06 }, exit: { opacity: 0, filter: 'blur(18px)', scale: 1.13 } },
}

function ProductCampaign({ product }: { product: Product }) {
  const selectedMotion = campaignMotion[product.movement]
  return (
    <>
      <AnimatePresence mode="wait">
        <motion.img
          key={`campaign-${product.id}`}
          className={`campaign-image campaign-${product.movement} campaign-image-${product.slug}`}
          src={product.image}
          alt=""
          initial={selectedMotion.initial}
          animate={selectedMotion.animate}
          exit={selectedMotion.exit}
          transition={{ duration: product.movement === 'mist' ? .95 : .72, ease: [0.22, 1, 0.36, 1] }}
        />
      </AnimatePresence>
      <div className="campaign-shade" />
      <span className={`campaign-atmosphere campaign-atmosphere-${product.slug}`} aria-hidden="true"><i /><i /><i /></span>
      <motion.div key={`signature-${product.id}`} className="campaign-signature" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .65, delay: .22 }}>
        <span>{product.process}</span>
        <strong>{product.notes}</strong>
      </motion.div>
      <span className="campaign-motion-label">Movimiento {product.number} · {product.movement === 'reveal' ? 'Ascenso' : product.movement === 'drift' ? 'Deriva' : 'Niebla'}</span>
    </>
  )
}

function CinematicHero() {
  const heroRef = useRef<HTMLElement>(null)
  const reduceMotion = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end end'] })
  const progress = useSpring(scrollYProgress, { stiffness: 90, damping: 24, mass: 0.25 })
  const imageScale = useTransform(progress, [0, 1], [1.015, reduceMotion ? 1.015 : 1.14])
  const imageY = useTransform(progress, [0, 1], ['0%', reduceMotion ? '0%' : '6%'])
  const copyY = useTransform(progress, [0, 0.68], ['0%', reduceMotion ? '0%' : '-18%'])
  const copyOpacity = useTransform(progress, [0, 0.48, 0.72], [1, 1, reduceMotion ? 1 : 0])
  const wordX = useTransform(progress, [0.18, 0.82], [reduceMotion ? '0%' : '20%', reduceMotion ? '0%' : '-18%'])
  const wordOpacity = useTransform(progress, [0.12, 0.35, 0.73, 0.92], [0, 0.78, 0.78, 0])
  const progressScale = useTransform(progress, [0, 1], [0, 1])

  return (
    <section className="hero-cinema" id="inicio" ref={heroRef}>
      <div className="hero-sticky">
        <motion.img
          style={{ scale: imageScale, y: imageY }}
          initial={{ opacity: 0, filter: 'brightness(.72)' }}
          animate={{ opacity: 1, filter: 'brightness(1)' }}
          transition={{ duration: 1.8, ease: [0.22, 1, 0.36, 1] }}
          className="hero-image"
          src="/images/lumbre-hero.webp"
          alt="Café Lumbre, una taza de cerámica y granos bajo la luz de la mañana"
          fetchPriority="high"
        />
        <div className="hero-shade" />
        <div className="hero-grain" aria-hidden="true" />
        <div className="hero-atmosphere" aria-hidden="true"><i /><i /><i /></div>

        <motion.div className="hero-copy" style={{ y: copyY, opacity: copyOpacity }}>
          <p className="kicker"><span /> Café de especialidad · Buenos Aires</p>
          <h1>El fuego<br />también sabe<br /><em>esperar.</em></h1>
          <p className="hero-text">Cafés de origen tostados en pequeños lotes. Para que el primer gesto del día vuelva a sentirse propio.</p>
          <div className="hero-ctas"><a className="button button-primary" href="#tienda">Elegir mi café <ArrowRight size={15} /></a><a className="text-link" href="#origen">Conocer Lumbre <ArrowDown size={16} /></a></div>
        </motion.div>

        <motion.div className="kinetic-word" style={{ x: wordX, opacity: wordOpacity }} aria-hidden="true">
          <span>FUEGO</span><i>QUE</i><span>ACOMPAÑA</span>
        </motion.div>

        <div className="hero-rail" aria-hidden="true">
          <span>TOSTADO SEMANAL</span><i /><span>CABA · ARGENTINA</span>
        </div>
        <div className="hero-index"><span>01</span><i /><span>05</span></div>
        <p className="hero-note">Lote 08 · Temporada 2026<br /><strong>Despacho dentro de 72 horas</strong></p>
        <a className="scroll-orbit" href="#origen" aria-label="Bajar a nuestra historia"><span>Descubrí el origen · Pausá un momento · </span><ArrowDown /></a>
        <motion.div className="hero-progress" style={{ scaleX: progressScale }} />
      </div>
    </section>
  )
}

function moveTab(event: KeyboardEvent<HTMLButtonElement>, index: number, count: number, onSelect: (next: number) => void) {
  const keys = ['ArrowRight', 'ArrowLeft', 'Home', 'End']
  if (!keys.includes(event.key)) return
  event.preventDefault()
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? count - 1 : event.key === 'ArrowRight' ? (index + 1) % count : (index - 1 + count) % count
  onSelect(next)
  requestAnimationFrame(() => event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus())
}

function readSavedCart() {
  try {
    const saved = window.localStorage.getItem('lumbre-demo-cart')
    return saved ? JSON.parse(saved) as Record<number, number> : {}
  } catch {
    return {}
  }
}

export function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [cart, setCart] = useState<Record<number, number>>(readSavedCart)
  const [cartOpen, setCartOpen] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState(() => products.find((product) => product.slug === new URLSearchParams(window.location.search).get('product'))?.id ?? products[0].id)
  const [added, setAdded] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [subscribeState, setSubscribeState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [ritualStep, setRitualStep] = useState(0)
  const [ritualAuto, setRitualAuto] = useState(true)
  const [ritualRestartKey, setRitualRestartKey] = useState(0)
  const ritualRef = useRef<HTMLElement>(null)
  const ritualInView = useInView(ritualRef, { amount: .35 })
  const reduceMotion = useReducedMotion()
  const [postalCode, setPostalCode] = useState('')
  const [shippingQuote, setShippingQuote] = useState<ShippingQuote | null>(null)
  const [shippingError, setShippingError] = useState(false)
  const [shippingLoading, setShippingLoading] = useState(false)
  const [orderConfirmed, setOrderConfirmed] = useState(false)
  const [orderNumber, setOrderNumber] = useState('')
  const [orderSubmitting, setOrderSubmitting] = useState(false)
  const [orderError, setOrderError] = useState('')
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'approved' | 'pending' | 'rejected'>('idle')
  const [paymentId, setPaymentId] = useState('')
  const [paymentError, setPaymentError] = useState('')
  const [paymentProvider, setPaymentProvider] = useState<'checking' | 'sandbox' | 'mercado_pago'>('sandbox')
  const [paymentCheckoutUrl, setPaymentCheckoutUrl] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')
  const cartDrawerRef = useRef<HTMLElement>(null)
  const cartCloseRef = useRef<HTMLButtonElement>(null)
  const cartTriggerRef = useRef<HTMLButtonElement>(null)
  const handledEntryProduct = useRef(false)
  const formStartedAt = useRef(Date.now())
  const [website, setWebsite] = useState('')
  const selectedProduct = products.find((product) => product.id === selectedProductId) ?? products[0]
  const cartCount = Object.values(cart).reduce((total, quantity) => total + quantity, 0)
  const cartItems = products.filter((product) => cart[product.id]).map((product) => ({ product, quantity: cart[product.id] }))
  const subtotal = cartItems.reduce((total, item) => total + item.product.priceValue * item.quantity, 0)
  const total = subtotal + (shippingQuote?.price ?? 0)

  useEffect(() => {
    if (!added) return
    const timer = window.setTimeout(() => setAdded(null), 2600)
    return () => window.clearTimeout(timer)
  }, [added])

  useEffect(() => {
    window.localStorage.setItem('lumbre-demo-cart', JSON.stringify(cart))
  }, [cart])

  useEffect(() => {
    if (handledEntryProduct.current) return
    handledEntryProduct.current = true
    const params = new URLSearchParams(window.location.search)
    const product = products.find((item) => item.slug === params.get('product'))
    if (product && params.get('add') === '1') {
      setCart((current) => ({ ...current, [product.id]: (current[product.id] ?? 0) + 1 }))
      setAdded(product.name)
      setCartOpen(true)
      params.delete('add')
      window.history.replaceState({}, '', `${window.location.pathname}${params.size ? `?${params}` : ''}${window.location.hash}`)
    }
  }, [])

  useEffect(() => {
    document.body.style.overflow = cartOpen ? 'hidden' : ''
    if (!cartOpen) return () => { document.body.style.overflow = '' }
    const previous = document.activeElement as HTMLElement | null
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') setCartOpen(false)
      if (event.key !== 'Tab' || !cartDrawerRef.current) return
      const focusable = [...cartDrawerRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled])')]
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    window.addEventListener('keydown', onKeyDown)
    requestAnimationFrame(() => cartCloseRef.current?.focus())
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKeyDown)
      previous?.focus()
    }
  }, [cartOpen])

  useEffect(() => {
    if (!ritualAuto || !ritualInView || reduceMotion) return
    const timer = window.setInterval(() => setRitualStep((current) => (current + 1) % rituals.length), 5200)
    return () => window.clearInterval(timer)
  }, [ritualAuto, ritualInView, reduceMotion])

  const addProduct = (product: Product) => {
    setCart((current) => ({ ...current, [product.id]: (current[product.id] ?? 0) + 1 }))
    setAdded(product.name)
    setOrderConfirmed(false)
    setPaymentStatus('idle')
    setPaymentId('')
    setPaymentProvider('sandbox')
    setPaymentCheckoutUrl('')
    setCartOpen(true)
  }

  const updateQuantity = (productId: number, amount: number) => {
    setCart((current) => {
      const nextQuantity = Math.max(0, (current[productId] ?? 0) + amount)
      const next = { ...current }
      if (nextQuantity === 0) delete next[productId]
      else next[productId] = nextQuantity
      return next
    })
  }

  const calculateShipping = async (event: FormEvent) => {
    event.preventDefault()
    const localQuote = estimateShipping(postalCode)
    if (!localQuote) { setShippingQuote(null); setShippingError(true); return }
    setShippingLoading(true)
    setShippingError(false)
    try {
      const response = await fetch(`/api/shipping/quote?postal=${encodeURIComponent(postalCode)}`)
      if (!response.ok) throw new Error('quote_failed')
      setShippingQuote(await response.json() as ShippingQuote)
    } catch {
      setShippingQuote(localQuote)
    } finally {
      setShippingLoading(false)
    }
  }

  const confirmOrder = async (event: FormEvent) => {
    event.preventDefault()
    if (!cartCount || !shippingQuote || !customerName || !customerEmail || !customerAddress) return
    setOrderSubmitting(true)
    setOrderError('')
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          customer: { name: customerName, email: customerEmail, address: customerAddress },
          postalCode,
          items: cartItems.map(({ product, quantity }) => ({ productId: product.id, quantity })),
          startedAt: formStartedAt.current,
          website,
        }),
      })
      const result = await response.json() as { orderNumber?: string; message?: string }
      if (!response.ok || !result.orderNumber) throw new Error(result.message || 'order_failed')
      setOrderNumber(result.orderNumber)
      setPaymentStatus('idle')
      setPaymentId('')
      setPaymentProvider('checking')
      try {
        const sessionResponse = await fetch('/api/payments/session', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ orderNumber: result.orderNumber }) })
        const session = await sessionResponse.json() as { mode?: 'sandbox' | 'mercado_pago'; checkoutUrl?: string; message?: string }
        if (!sessionResponse.ok || !session.mode) throw new Error(session.message || 'payment_session_failed')
        setPaymentProvider(session.mode)
        setPaymentCheckoutUrl(session.checkoutUrl ?? '')
      } catch {
        setPaymentProvider('sandbox')
        setPaymentError('El proveedor externo no respondió; activamos el simulador seguro para que puedas completar la demo.')
      }
      setOrderConfirmed(true)
    } catch {
      setOrderError('No pudimos guardar el pedido de muestra. Probá nuevamente en unos segundos.')
    } finally {
      setOrderSubmitting(false)
    }
  }

  const simulatePayment = async (outcome: 'approved' | 'pending' | 'rejected') => {
    if (!orderNumber || paymentStatus === 'processing') return
    setPaymentStatus('processing')
    setPaymentError('')
    try {
      const response = await fetch('/api/payments/sandbox', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ orderNumber, outcome }),
      })
      const result = await response.json() as { paymentId?: string; paymentStatus?: 'approved' | 'pending' | 'rejected'; message?: string }
      if (!response.ok || !result.paymentStatus) throw new Error(result.message || 'payment_failed')
      setPaymentStatus(result.paymentStatus)
      setPaymentId(result.paymentId ?? '')
    } catch {
      setPaymentStatus('idle')
      setPaymentError('El simulador de pago no respondió. Podés volver a intentarlo sin duplicar el pedido.')
    }
  }

  const closeCheckoutDemo = () => {
    if (paymentStatus === 'approved') setCart({})
    setOrderConfirmed(false)
    setPaymentStatus('idle')
    setPaymentId('')
    setPaymentProvider('sandbox')
    setPaymentCheckoutUrl('')
    setShippingQuote(null)
    setCartOpen(false)
  }

  const subscribe = async (event: FormEvent) => {
    event.preventDefault()
    if (!email.trim()) return
    setSubscribeState('submitting')
    try {
      const response = await fetch('/api/newsletter', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, startedAt: formStartedAt.current, website }) })
      if (!response.ok) throw new Error('subscribe_failed')
      setSubscribeState('success')
      formStartedAt.current = Date.now()
    } catch {
      setSubscribeState('error')
    }
  }

  return (
    <main>
      <SiteProgress />
      <header className="nav-shell">
        <Brand />
        <nav className="nav-links" aria-label="Navegación principal">
          <a href="#origen">Nuestro café</a><a href="#ritual">El ritual</a><a href="#tienda">Tienda</a>
        </nav>
        <div className="nav-actions">
          <a className="nav-shop" href="#tienda">Tienda demo</a>
          <button ref={cartTriggerRef} className="bag-button" onClick={() => setCartOpen(true)} aria-controls="cart-drawer" aria-expanded={cartOpen} aria-label={`Bolsa de compras: ${cartCount} productos`}><ShoppingBag size={17} /><span>{cartCount}</span></button>
          <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}>
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
        {menuOpen && (
          <motion.nav className="mobile-menu" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
            <a onClick={() => setMenuOpen(false)} href="#origen">Nuestro café</a>
            <a onClick={() => setMenuOpen(false)} href="#ritual">El ritual</a>
            <a onClick={() => setMenuOpen(false)} href="#tienda">Tienda</a>
          </motion.nav>
        )}
      </header>

      <CinematicHero />

      <div className="ticker" aria-hidden="true"><div>ORIGEN · TIEMPO · FUEGO · PAUSA · BUENOS AIRES · ORIGEN · TIEMPO · FUEGO · PAUSA · BUENOS AIRES · ORIGEN · TIEMPO · FUEGO · PAUSA ·</div></div>

      <section className="origin section" id="origen">
        <div className="origin-grid">
          <Reveal className="origin-copy">
            <SectionHeading eyebrow="Nuestra forma de hacer">
              El café no se apura.<br /><em>Nosotros tampoco.</em>
            </SectionHeading>
            <p>Elegimos lotes pequeños y trazables. Los tostamos en Buenos Aires con perfiles que respetan el lugar donde nació cada grano, no para esconderlo detrás del fuego.</p>
            <a className="inline-link" href="#proceso">Conocé nuestro proceso <ArrowRight size={17} /></a>
            <div className="origin-facts">
              <div><strong>100%</strong><span>trazable</span></div>
              <div><strong>72 h</strong><span>del tueste al envío</span></div>
              <div><strong>+1.500 m</strong><span>cafés de altura</span></div>
            </div>
          </Reveal>
          <Reveal className="origin-visual" delay={.1}>
            <span className="origin-vertical">DEL CULTIVO A LA TAZA · SIN ATAJOS</span>
            <img src="/images/lumbre-roastery.webp" alt="Manos de un tostador envasando café recién tostado" loading="lazy" />
            <div className="origin-caption"><span>Microtostadero</span><strong>Chacarita, Buenos Aires</strong></div>
            <div className="round-stamp"><Sparkles size={16} /><span>Tostado<br />en origen</span></div>
          </Reveal>
        </div>
      </section>

      <section className="producer-story" aria-labelledby="producer-title">
        <Reveal className="producer-image">
          <img src="/images/lumbre-producer.webp" alt="Productor de café cosechando cerezas entre la neblina de las Yungas" loading="lazy" />
          <span className="producer-photo-note">Cosecha 2026 · Valle de las Yungas</span>
        </Reveal>
        <Reveal className="producer-copy" delay={.08}>
          <p className="eyebrow">Productor destacado</p>
          <p className="producer-signature" aria-hidden="true">Familia Tolaba</p>
          <h2 id="producer-title">La trazabilidad<br />tiene <em>nombre.</em></h2>
          <p>En una ladera húmeda de las Yungas, Marta y Daniel Tolaba cultivan Quebrada junto a otras doce familias. Cada parcela se cosecha a mano y se seca por separado para que su identidad llegue intacta a la taza.</p>
          <dl className="producer-data">
            <div><dt>Altura</dt><dd>1.680 msnm</dd></div>
            <div><dt>Proceso</dt><dd>Lavado · 36 h</dd></div>
            <div><dt>Cosecha</dt><dd>Mayo — agosto</dd></div>
          </dl>
          <a className="inline-link" href="#tienda">Probar este lote <ArrowRight size={17} /></a>
        </Reveal>
      </section>

      <section className="manifesto" id="proceso">
        <div className="manifesto-number">02</div>
        <Reveal>
          <p className="eyebrow eyebrow-light">Una declaración</p>
          <blockquote>“No buscamos el café perfecto.<br />Buscamos uno que te haga<br /><em>quedar un rato más.</em>”</blockquote>
        </Reveal>
        <div className="manifesto-foot"><span>Lumbre significa <i>fuego que acompaña</i></span><Flame size={20} /><span>Desde Buenos Aires · 2026</span></div>
      </section>

      <section className="shop section" id="tienda">
        <Reveal className="shop-heading">
          <SectionHeading eyebrow="Cafés de temporada" copy="Tres expresiones precisas de su origen. Seleccioná cada café para descubrir su perfil.">
            Tres orígenes.<br /><em>Una misma lumbre.</em>
          </SectionHeading>
          <span className="collection-count">03 lotes · Temporada 2026</span>
        </Reveal>
        <Reveal className="collection" delay={.08}>
          <div className="collection-stage" style={{ '--selected-accent': selectedProduct.accent } as React.CSSProperties}>
            <ProductCampaign product={selectedProduct} />
            <AnimatePresence mode="popLayout">
              <motion.span key={selectedProduct.id} className="collection-ghost" initial={{ opacity: 0, y: 45 }} animate={{ opacity: .12, y: 0 }} exit={{ opacity: 0, y: -35 }} transition={{ duration: .5 }} aria-hidden="true">{selectedProduct.name}</motion.span>
            </AnimatePresence>
            <div className="collection-tabs" role="tablist" aria-label="Elegir café">
              {products.map((product, index) => (
                <button key={product.id} id={`coffee-tab-${product.id}`} role="tab" aria-controls="coffee-panel" aria-selected={selectedProductId === product.id} tabIndex={selectedProductId === product.id ? 0 : -1} className={selectedProductId === product.id ? 'is-selected' : ''} onClick={() => setSelectedProductId(product.id)} onKeyDown={(event) => moveTab(event, index, products.length, (next) => setSelectedProductId(products[next].id))} style={{ '--thumb-image': `url(${product.image})` } as React.CSSProperties}>
                  <span>{product.number}</span><strong>{product.name}</strong><small>{product.origin}</small>
                </button>
              ))}
            </div>
          </div>
          <div className="collection-detail" id="coffee-panel" role="tabpanel" aria-labelledby={`coffee-tab-${selectedProduct.id}`}>
            <AnimatePresence mode="wait">
              <motion.div key={selectedProduct.id} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: .38 }}>
                <p className="collection-origin">{selectedProduct.origin}</p>
                <h3>{selectedProduct.name}</h3>
                <p className="collection-description">{selectedProduct.description}</p>
                <dl><div><dt>Notas</dt><dd>{selectedProduct.notes}</dd></div><div><dt>Tueste</dt><dd>{selectedProduct.roast}</dd></div><div><dt>Formato</dt><dd>250 g · En grano</dd></div></dl>
                <div className="collection-buy"><strong>{selectedProduct.price}</strong><div><button className="button button-copper" onClick={() => addProduct(selectedProduct)}>Probar en la tienda demo <ArrowRight size={15} /></button><a href={`/cafes/${selectedProduct.slug}`}>Ver ficha completa</a><a href={`mailto:hola@lumbrecafe.ar?subject=Consulta%20por%20${encodeURIComponent(selectedProduct.name)}`}>Consultar este café</a></div></div>
              </motion.div>
            </AnimatePresence>
          </div>
        </Reveal>
      </section>

      <section className="ritual section" id="ritual" ref={ritualRef}>
        <div className="ritual-header">
          <Reveal><SectionHeading eyebrow="El ritual Lumbre">Cuatro gestos.<br /><em>Una pausa.</em></SectionHeading></Reveal>
          <Reveal delay={.1}><p>No necesitás saber de café. Solo darte el tiempo de prepararlo con atención. Esta es nuestra receta para V60.</p><div className="recipe"><span>20 g café</span><span>320 ml agua</span><span>3:00 min</span></div><button className="ritual-autoplay" onClick={() => setRitualAuto((playing) => !playing)} aria-pressed={ritualAuto}>{ritualAuto ? <Pause /> : <Play />}{ritualAuto ? 'Pausar secuencia' : 'Reproducir secuencia'}</button></Reveal>
        </div>
        <Reveal className="ritual-photo-panel">
          <img src="/images/lumbre-brew.webp" alt="Barista preparando café de filtro lentamente con una tetera de cobre" loading="lazy" />
          <div className="ritual-photo-copy">
            <span>Manual de preparación · 01</span>
            <h3>La precisión<br />también puede<br /><em>ser íntima.</em></h3>
            <p>Una receta es apenas el comienzo. Después aparecen tu molino, tu agua y esa manera propia de medir el tiempo.</p>
          </div>
          <span className="ritual-photo-side">V60 · FILTRO · CASA</span>
        </Reveal>
        <Reveal className={`ritual-console ${ritualAuto ? 'is-playing' : ''}`}>
          <div className="ritual-dial" id="ritual-panel" role="tabpanel" aria-labelledby={`ritual-tab-${ritualStep}`} style={{ '--ritual-progress': `${(ritualStep + 1) * 25}%` } as React.CSSProperties}>
            <div className="dial-orbit"><i /><i /><i /><i /></div>
            <AnimatePresence mode="wait">
              <motion.div key={ritualStep} className="dial-content" initial={{ opacity: 0, scale: .92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.06 }} transition={{ duration: .38 }}>
                <span>{rituals[ritualStep].step} / 04</span>
                <RitualVideo step={ritualStep} playing={ritualAuto && ritualInView && !reduceMotion} restartKey={ritualRestartKey} />
                <h3>{rituals[ritualStep].title}</h3>
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="ritual-steps" role="tablist" aria-label="Pasos del ritual">
            {rituals.map((item, index) => (
              <button key={item.step} id={`ritual-tab-${index}`} role="tab" aria-controls="ritual-panel" aria-selected={ritualStep === index} tabIndex={ritualStep === index ? 0 : -1} className={ritualStep === index ? 'is-active' : ''} onKeyDown={(event) => moveTab(event, index, rituals.length, (next) => { setRitualStep(next); setRitualAuto(true); setRitualRestartKey((current) => current + 1) })} onClick={() => { setRitualStep(index); setRitualAuto(true); setRitualRestartKey((current) => current + 1) }}>
                <span>{item.step}</span><strong>{item.title}</strong><p>{item.copy}</p><ArrowRight aria-hidden="true" />
              </button>
            ))}
          </div>
        </Reveal>
        <Reveal className="ritual-quote"><span>92°C</span><p>El agua también tiene memoria.<br /><em>Tratala con calma.</em></p><span>03:00</span></Reveal>
      </section>

      <section className="stories section" aria-label="Experiencias Lumbre">
        <Reveal className="stories-heading"><p className="eyebrow">Más formas de encontrarnos</p><h2>El café sigue<br /><em>fuera de la taza.</em></h2></Reveal>
        <div className="story-grid">
          <Reveal className="story-card story-club">
            <div className="story-shade" />
            <div className="club-seal"><Flame /><span>CLUB<br />LUMBRE</span></div>
            <div className="story-copy"><span>Una caja · Una vez al mes</span><h3>El ritual llega<br />a tu puerta.</h3><p>Dos cafés de temporada, una guía y algo rico para acompañar. Sin permanencia.</p><a className="button button-light" href="#newsletter">Conocer el club <ArrowRight size={16} /></a></div>
          </Reveal>
          <Reveal className="story-card story-table" delay={.08}>
            <div className="story-shade" />
            <div className="story-index">02 / EXPERIENCIAS</div>
            <div className="story-copy"><span>Sábados en Chacarita</span><h3>Mesa abierta<br />en el tostadero.</h3><p>Una cata íntima para descubrir tres orígenes, conversar y aprender sin solemnidad.</p><a className="button button-light" href="mailto:hola@lumbrecafe.ar?subject=Mesa%20abierta">Reservar un lugar <ArrowRight size={16} /></a></div>
          </Reveal>
        </div>
      </section>

      <footer id="newsletter">
        <div className="footer-main">
          <div className="footer-brand"><Brand dark /><p>Café de origen tostado con paciencia<br />en Chacarita, Buenos Aires.</p></div>
          <div className="newsletter">
            <p className="eyebrow">Cartas desde el tostadero</p>
            <h2>Ideas para tomar<br />el café más lento.</h2>
            {subscribeState === 'success' ? <p className="success"><Check /> Listo. La suscripción quedó registrada.</p> : (
              <><form onSubmit={subscribe}><label className="sr-only" htmlFor="email">Tu email</label><input id="email" name="email" type="email" autoComplete="email" required placeholder="Tu email" value={email} onChange={(e) => setEmail(e.target.value)} /><label className="form-trap" aria-hidden="true">Sitio web<input name="website" type="text" autoComplete="off" tabIndex={-1} value={website} onChange={(event) => setWebsite(event.target.value)} /></label><button disabled={subscribeState === 'submitting'} aria-label="Suscribirme">{subscribeState === 'submitting' ? <span className="sr-only">Enviando</span> : <ArrowRight />}</button></form>{subscribeState === 'error' && <p className="field-error" role="alert">No pudimos registrar el email. Probá nuevamente.</p>}</>
            )}
          </div>
          <div className="footer-nav"><p>Explorar</p><a href="#origen">Nuestra historia</a><a href="#tienda">Cafés</a><a href="#ritual">Preparación</a><a href="#newsletter">Club Lumbre</a></div>
          <div className="footer-nav"><p>Proyecto</p><a href="/proyecto">Caso de estudio</a><a href="#newsletter">Chacarita · CABA</a><a href="#newsletter">Instagram <AtSign size={13} /></a><a href="mailto:hola@lumbrecafe.ar">hola@lumbrecafe.ar</a><a href="/privacidad">Privacidad</a></div>
        </div>
        <div className="footer-bottom"><span>© 2026 Lumbre Café</span><span>Hecho con fuego lento en Argentina</span><button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Volver arriba <ChevronDown size={14} /></button></div>
      </footer>

      <AnimatePresence>
        {cartOpen && (
          <>
            <motion.button className="cart-backdrop" aria-label="Cerrar bolsa" onClick={() => setCartOpen(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            <motion.aside ref={cartDrawerRef} id="cart-drawer" className="cart-drawer" role="dialog" aria-modal="true" aria-labelledby="cart-title" aria-describedby="cart-description" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 220, damping: 28 }}>
              <header><div><span>Checkout conectado</span><h2 id="cart-title">Tu bolsa</h2></div><button ref={cartCloseRef} onClick={() => setCartOpen(false)} aria-label="Cerrar"><X /></button></header>
              <p id="cart-description" className="sr-only">Carrito de demostración con cálculo de envío y registro de pedidos mediante una API.</p>
              {orderConfirmed ? (
                <motion.div className={`order-success payment-${paymentStatus}`} initial={{ opacity: 0, scale: .96 }} animate={{ opacity: 1, scale: 1 }}>
                  <div className="payment-stage"><span>01</span><i /><span>Pedido</span><i /><span className="is-active">02</span><i /><span className="is-active">{paymentProvider === 'mercado_pago' ? 'Checkout Pro' : 'Pago sandbox'}</span></div>
                  <div className="success-mark">{paymentStatus === 'approved' ? <Check /> : paymentStatus === 'pending' ? <Clock3 /> : paymentStatus === 'rejected' ? <CircleAlert /> : <CreditCard />}</div>
                  <p className="eyebrow">{paymentStatus === 'approved' ? 'Pago de prueba aprobado' : paymentStatus === 'pending' ? 'Pago de prueba pendiente' : paymentStatus === 'rejected' ? 'Pago de prueba rechazado' : paymentProvider === 'mercado_pago' ? 'Mercado Pago Checkout Pro' : 'Lumbre Sandbox Pay'}</p>
                  <h3>{paymentStatus === 'approved' ? `Listo, ${customerName.split(' ')[0]}.` : paymentStatus === 'pending' ? 'Quedó en revisión.' : paymentStatus === 'rejected' ? 'El pago no pasó.' : paymentProvider === 'mercado_pago' ? 'Continuá el pago.' : 'Elegí un resultado.'}</h3>
                  <p>{paymentStatus === 'approved' ? 'El flujo completo quedó registrado y el pedido ya figura como pagado en el panel.' : paymentStatus === 'pending' ? 'El pedido sigue abierto. Podés aprobarlo para completar la demostración.' : paymentStatus === 'rejected' ? 'No se perdió el pedido. Probá nuevamente con otro resultado.' : paymentProvider === 'mercado_pago' ? 'Vas a continuar en el checkout seguro del proveedor. El estado volverá por webhook y se conciliará con este pedido.' : 'Este entorno simula las respuestas de una pasarela real. No pide tarjeta, no cobra y no mueve dinero.'}</p>
                  <dl><div><dt>Pedido</dt><dd>{orderNumber}</dd></div><div><dt>Entrega</dt><dd>{shippingQuote?.eta}</dd></div><div><dt>Total demo</dt><dd>${total.toLocaleString('es-AR')}</dd></div>{paymentId && <div><dt>Pago</dt><dd>{paymentId}</dd></div>}</dl>
                  {paymentStatus !== 'approved' && paymentProvider === 'mercado_pago' && paymentCheckoutUrl && <div className="payment-actions"><a className="button button-copper" href={paymentCheckoutUrl}>Continuar con Mercado Pago <ArrowRight /></a></div>}
                  {paymentStatus !== 'approved' && paymentProvider !== 'mercado_pago' && <div className="payment-actions" aria-label="Resultados de pago de demostración">
                    <button className="button button-copper" disabled={paymentStatus === 'processing'} onClick={() => simulatePayment('approved')}>{paymentStatus === 'processing' ? 'Procesando…' : <>Simular aprobado <Check /></>}</button>
                    <div><button disabled={paymentStatus === 'processing'} onClick={() => simulatePayment('pending')}><Clock3 /> Simular pendiente</button><button disabled={paymentStatus === 'processing'} onClick={() => simulatePayment('rejected')}><CircleAlert /> Simular rechazo</button></div>
                  </div>}
                  {paymentError && <p className="field-error" role="alert">{paymentError}</p>}
                  <button className="payment-close" onClick={closeCheckoutDemo}>{paymentStatus === 'approved' ? 'Cerrar demostración' : 'Salir y dejar el pedido abierto'}</button>
                  <small className="payment-disclaimer"><ShieldCheck size={13} /> {paymentProvider === 'mercado_pago' ? 'La tienda no recibe ni almacena datos de tarjeta.' : 'Entorno sandbox. Nunca ingreses datos reales de pago.'}</small>
                </motion.div>
              ) : cartItems.length === 0 ? (
                <div className="empty-cart"><ShoppingBag /><h3>La bolsa está vacía.</h3><p>Elegí uno de los tres lotes. Esta tienda es una muestra y no realizará ningún cobro.</p><button className="button button-copper" onClick={() => setCartOpen(false)}>Explorar cafés</button></div>
              ) : (
                <div className="cart-flow">
                  <div className="cart-items">
                    {cartItems.map(({ product, quantity }) => (
                      <div className="cart-item" key={product.id}>
                        <div className="cart-thumb" style={{ backgroundImage: `url(${product.image})` }}><span>{product.number}</span></div>
                        <div><span>{product.origin}</span><h3>{product.name}</h3><strong>${(product.priceValue * quantity).toLocaleString('es-AR')}</strong></div>
                        <div className="quantity"><button onClick={() => updateQuantity(product.id, -1)} aria-label={`Quitar un ${product.name}`}><Minus /></button><span>{quantity}</span><button onClick={() => updateQuantity(product.id, 1)} aria-label={`Agregar un ${product.name}`}><Plus /></button></div>
                      </div>
                    ))}
                  </div>

                  <section className="shipping-calculator" aria-labelledby="shipping-title">
                    <div className="cart-section-title"><Truck /><div><span>Paso 01</span><h3 id="shipping-title">Calcular envío</h3></div></div>
                    <form onSubmit={calculateShipping}><label htmlFor="postal">Código postal argentino</label><div><input id="postal" name="postalCode" inputMode="text" autoComplete="postal-code" required value={postalCode} onChange={(event) => setPostalCode(event.target.value.toUpperCase())} placeholder="Ej. 1414 o C1414" /><button disabled={shippingLoading}>{shippingLoading ? 'Consultando…' : 'Calcular'}</button></div>{shippingError && <p className="field-error" role="alert">Ingresá un código postal de cuatro números.</p>}</form>
                    <Suspense fallback={<div className="shipping-map map-loading">Preparando mapa…</div>}><ShippingMap quote={shippingQuote} /></Suspense>
                    {shippingQuote && <motion.div className="shipping-result" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}><span>{shippingQuote.region}</span><strong>${shippingQuote.price.toLocaleString('es-AR')}</strong><small>{shippingQuote.eta} · {shippingQuote.provider ?? 'estimación local'}</small></motion.div>}
                  </section>

                  <form className="checkout-form" onSubmit={confirmOrder}>
                    <div className="cart-section-title"><Check /><div><span>Paso 02</span><h3>Confirmación</h3></div></div>
                    <label>Nombre<input name="name" autoComplete="name" required value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Nombre de prueba" /></label>
                    <label>Email<input name="email" autoComplete="email" required type="email" value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} placeholder="demo@example.com" /></label>
                    <label>Dirección<input name="address" autoComplete="street-address" required value={customerAddress} onChange={(event) => setCustomerAddress(event.target.value)} placeholder="Dirección de demostración" /></label>
                    <label className="form-trap" aria-hidden="true">Sitio web<input name="website" type="text" autoComplete="off" tabIndex={-1} value={website} onChange={(event) => setWebsite(event.target.value)} /></label>
                    <div className="cart-totals"><span>Productos <strong>${subtotal.toLocaleString('es-AR')}</strong></span><span>Envío <strong>{shippingQuote ? `$${shippingQuote.price.toLocaleString('es-AR')}` : 'A calcular'}</strong></span><span>Total estimado <strong>${total.toLocaleString('es-AR')}</strong></span></div>
                    <button className="button button-copper" disabled={!shippingQuote || orderSubmitting}>{orderSubmitting ? 'Guardando pedido…' : <>Crear pedido y continuar al pago <ArrowRight size={15} /></>}</button>
                    {orderError && <p className="field-error" role="alert">{orderError}</p>}
                    <p>No se solicitará tarjeta. Usá datos ficticios; consultá la <a href="/privacidad">política de demostración</a>.</p>
                  </form>
                </div>
              )}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className={`toast ${added ? 'toast-visible' : ''}`} role="status" aria-live="polite"><Check size={16} /><span><strong>{added}</strong> se sumó a tu bolsa</span></div>
      <div className="site-noise" aria-hidden="true" />
    </main>
  )
}
