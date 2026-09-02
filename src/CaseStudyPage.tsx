import { Activity, ArrowLeft, ArrowRight, Database, Flame, Globe2, Layers3, Search, Server, ShieldCheck, ShoppingBag, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { products } from './catalog'

type SystemState = 'checking' | 'online' | 'offline'

function CaseWordmark() {
  return (
    <a className="wordmark" href="/#inicio" aria-label="Lumbre Café, inicio">
      <span className="brand-mark" aria-hidden="true"><Flame size={14} strokeWidth={1.4} /></span>
      <span>Lumbre <small>café</small></span>
    </a>
  )
}

export function CaseStudyPage() {
  const [systemState, setSystemState] = useState<SystemState>('checking')
  const [catalogCount, setCatalogCount] = useState(products.length)

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([
      fetch('/api/health', { signal: controller.signal }).then((response) => response.ok ? response.json() : Promise.reject()),
      fetch('/api/catalog', { signal: controller.signal }).then((response) => response.ok ? response.json() : Promise.reject()),
    ]).then(([health, catalog]) => {
      if (health.ok && Array.isArray(catalog.products)) {
        setCatalogCount(catalog.products.length)
        setSystemState('online')
      }
    }).catch(() => setSystemState('offline'))
    return () => controller.abort()
  }, [])

  return (
    <main className="case-page">
      <header className="product-nav case-nav">
        <CaseWordmark />
        <a className="product-back" href="/#tienda"><ArrowLeft /> Ver la tienda</a>
      </header>

      <section className="case-hero">
        <div className="case-hero-copy">
          <p className="eyebrow">Caso de estudio · E-commerce conceptual</p>
          <h1>Una marca que se siente.<br /><em>Un sistema que responde.</em></h1>
          <p>Lumbre combina dirección de arte editorial, interacción, catálogo, checkout y servicios persistentes en una experiencia pensada como producto real.</p>
          <div className={`case-live case-live-${systemState}`} role="status" aria-live="polite">
            <i /> <Activity />
            {systemState === 'checking' ? 'Comprobando servicios' : systemState === 'online' ? `API activa · ${catalogCount} productos sincronizados` : 'Vista local · API no disponible'}
          </div>
        </div>
        <div className="case-triptych" aria-label="Campañas visuales de los tres cafés">
          {products.map((product) => (
            <a href={`/cafes/${product.slug}`} key={product.id}>
              <img src={product.image} alt={`Campaña de ${product.name}`} />
              <span>{product.number}</span>
              <strong>{product.name}</strong>
            </a>
          ))}
        </div>
      </section>

      <section className="case-metrics" aria-label="Alcance del proyecto">
        <div><strong>03</strong><span>campañas integradas</span></div>
        <div><strong>05</strong><span>rutas indexables</span></div>
        <div><strong>08</strong><span>endpoints de negocio</span></div>
        <div><strong>100%</strong><span>responsive y accesible</span></div>
      </section>

      <section className="case-section case-system">
        <div className="case-section-heading">
          <p className="eyebrow">Arquitectura del producto</p>
          <h2>Más que una landing bonita.</h2>
          <p>Cada capa visual está conectada con un comportamiento verificable: una misma fuente alimenta catálogo, fichas, carrito, precios y metadatos.</p>
        </div>
        <div className="case-flow" aria-label="Flujo de la arquitectura">
          <article><span>01</span><Layers3 /><h3>Experiencia</h3><p>React, TypeScript, componentes reutilizables y movimiento con soporte reducido.</p></article>
          <i aria-hidden="true"><ArrowRight /></i>
          <article><span>02</span><Server /><h3>Servicios</h3><p>Catálogo, cotización, pedidos, pagos, webhooks y newsletter validados en el servidor.</p></article>
          <i aria-hidden="true"><ArrowRight /></i>
          <article><span>03</span><Database /><h3>Persistencia</h3><p>Pedidos de muestra y suscriptores guardados en una base de datos real.</p></article>
        </div>
      </section>

      <section className="case-section case-capabilities">
        <div className="case-section-heading">
          <p className="eyebrow">Capacidades demostradas</p>
          <h2>Diseño, comercio y operación.</h2>
        </div>
        <div className="case-capability-grid">
          <article><Sparkles /><span>Dirección visual</span><h3>Campañas propias por origen.</h3><p>Tres escenas fotográficas con encuadre, color y transición específicos para cada producto.</p></article>
          <article><ShoppingBag /><span>Comercio</span><h3>Un carrito que conserva el contexto.</h3><p>Cantidades, totales, cotización postal, mapa, formulario y confirmación de pedido.</p></article>
          <article><ShieldCheck /><span>Backend</span><h3>Pagos conciliados en el servidor.</h3><p>Los totales se recalculan, los webhooks se autentican y cada evento se procesa una sola vez.</p></article>
          <article><Search /><span>Descubrimiento</span><h3>Cada café tiene una URL propia.</h3><p>Canonical, sitemap, Open Graph, JSON-LD y metadatos dinámicos listos para buscadores.</p></article>
          <article><Globe2 /><span>Integración</span><h3>Proveedores desacoplados.</h3><p>Envíos, OpenStreetMap y un adaptador de Mercado Pago con fallback sandbox mantienen la demo operativa.</p></article>
          <article><Activity /><span>Calidad</span><h3>Estados reales, no pantallas perfectas.</h3><p>Cargas, errores, confirmaciones, teclado, foco y preferencias de movimiento contempladas.</p></article>
        </div>
      </section>

      <section className="case-cta">
        <p className="eyebrow">Explorar la experiencia</p>
        <h2>La historia termina<br /><em>en una taza.</em></h2>
        <div><a className="button button-light" href="/#tienda">Abrir la tienda <ArrowRight /></a><a className="text-link" href="/admin">Abrir panel demo <ArrowRight /></a></div>
      </section>

      <footer className="product-footer case-footer">
        <CaseWordmark />
        <p>Proyecto conceptual de diseño y desarrollo full-stack</p>
        <a href="/privacidad">Privacidad y datos de demostración</a>
      </footer>
    </main>
  )
}
