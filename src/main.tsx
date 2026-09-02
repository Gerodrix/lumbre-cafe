import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { AdminPage } from './AdminPage'
import { CaseStudyPage } from './CaseStudyPage'
import { getProductBySlug } from './catalog'
import { PrivacyPage, ProductPage } from './ProductPage'
import './styles.css'

const product = window.location.pathname.startsWith('/cafes/') ? getProductBySlug(window.location.pathname.split('/').filter(Boolean)[1]) : undefined
const page = window.location.pathname === '/admin' ? <AdminPage /> : window.location.pathname === '/proyecto' ? <CaseStudyPage /> : window.location.pathname === '/privacidad' ? <PrivacyPage /> : product ? <ProductPage product={product} /> : <App />

createRoot(document.getElementById('root')!).render(<StrictMode>{page}</StrictMode>)
