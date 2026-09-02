import { ArrowLeft, ArrowRight, Check, Flame, ShieldCheck, Truck } from 'lucide-react'
import type { CSSProperties } from 'react'
import { Product, products } from './catalog'

function ProductWordmark() {
  return (
    <a className="wordmark" href="/#inicio" aria-label="Lumbre Café, inicio">
      <span className="brand-mark" aria-hidden="true"><Flame size={14} strokeWidth={1.4} /></span>
      <span>Lumbre <small>café</small></span>
    </a>
  )
}

export function ProductPage({ product }: { product: Product }) {
  const related = products.filter((item) => item.id !== product.id)

  return (
    <main className={`product-page product-page-${product.slug}`} style={{ '--selected-accent': product.accent } as CSSProperties}>
      <header className="product-nav">
        <ProductWordmark />
        <a className="product-back" href="/#tienda"><ArrowLeft /> Volver a los cafés</a>
      </header>

      <section className="product-page-hero" aria-labelledby="product-page-title">
        <figure className={`product-page-photo product-page-photo-${product.movement}`}>
          <img src={product.image} alt={`${product.name}, café de origen de ${product.origin}`} fetchPriority="high" />
          <span className={`product-page-atmosphere product-page-atmosphere-${product.slug}`} aria-hidden="true"><i /><i /></span>
          <figcaption>{product.number} · Cosecha 2026 · {product.process}</figcaption>
        </figure>

        <div className="product-page-copy">
          <p className="eyebrow">{product.origin}</p>
          <h1 id="product-page-title">{product.name}</h1>
          <p className="product-page-lead">{product.description}</p>
          <dl className="product-page-data">
            <div><dt>Notas</dt><dd>{product.notes}</dd></div>
            <div><dt>Tueste</dt><dd>{product.roast}</dd></div>
            <div><dt>Proceso</dt><dd>{product.process}</dd></div>
            <div><dt>Altura</dt><dd>{product.altitude}</dd></div>
            <div><dt>Formato</dt><dd>250 g · En grano</dd></div>
          </dl>
          <div className="product-page-action">
            <strong>{product.price}</strong>
            <a className="button button-copper" href={`/?product=${product.slug}&add=1#tienda`}>
              Agregar a la bolsa <ArrowRight />
            </a>
          </div>
          <ul className="product-trust" aria-label="Condiciones de compra demostrativa">
            <li><Check /> Stock de demostración</li>
            <li><Truck /> Envíos estimados por API</li>
            <li><ShieldCheck /> Checkout seguro de muestra</li>
          </ul>
        </div>
      </section>

      <section className="product-page-note">
        <p className="eyebrow">Ficha de origen</p>
        <h2>Una identidad que llega intacta a la taza.</h2>
        <p>Esta página individual permite compartir, indexar y presentar cada lote con su propio contexto. El catálogo, los precios y el checkout consumen la misma capa de datos que la experiencia principal.</p>
      </section>

      <section className="related-products" aria-labelledby="related-title">
        <div><p className="eyebrow">Seguir explorando</p><h2 id="related-title">Otros lotes de temporada.</h2></div>
        <div className="related-grid">
          {related.map((item) => (
            <a href={`/cafes/${item.slug}`} key={item.id}>
              <img src={item.image} alt="" loading="lazy" />
              <span>{item.origin}</span>
              <strong>{item.name}</strong>
              <small>{item.notes}</small>
            </a>
          ))}
        </div>
      </section>

      <footer className="product-footer">
        <ProductWordmark />
        <p>© 2026 Lumbre Café · Proyecto conceptual de e-commerce</p>
        <a href="/privacidad">Privacidad y datos de demostración</a>
      </footer>
    </main>
  )
}

export function PrivacyPage() {
  return (
    <main className="legal-page">
      <header className="product-nav"><ProductWordmark /><a className="product-back" href="/"><ArrowLeft /> Volver al sitio</a></header>
      <article>
        <p className="eyebrow">Transparencia de la demostración</p>
        <h1>Privacidad y datos.</h1>
        <p>Lumbre Café es una marca ficticia creada como caso de portfolio. El checkout no procesa pagos ni tarjetas.</p>
        <h2>Pedidos de muestra</h2>
        <p>Los datos enviados en el checkout se utilizan únicamente para demostrar la creación de un pedido mediante una API y una base de datos. No uses información sensible o una dirección real.</p>
        <h2>Newsletter</h2>
        <p>El formulario demuestra una suscripción persistente. El correo no se incorpora a campañas comerciales ni se comparte con terceros.</p>
        <h2>Servicios externos</h2>
        <p>El mapa utiliza teselas de OpenStreetMap. No se solicitan permisos de ubicación del dispositivo.</p>
        <h2>Pagos sandbox y panel</h2>
        <p>El proveedor de pagos es una simulación técnica: permite aprobar, dejar pendiente o rechazar una operación sin solicitar tarjetas. El panel administrativo usa una sesión temporal y solo gestiona datos ficticios de esta demostración.</p>
        <h2>Contacto</h2>
        <p>Para una implementación comercial, esta política deberá reemplazarse por la información legal y fiscal del negocio real.</p>
      </article>
    </main>
  )
}
