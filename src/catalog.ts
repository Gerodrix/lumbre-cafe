import catalogData from './data/catalog.json'

export type Product = {
  id: number
  slug: string
  sku: string
  name: string
  origin: string
  roast: string
  notes: string
  price: string
  priceValue: number
  accent: string
  number: string
  image: string
  packshot: string
  description: string
  movement: 'reveal' | 'drift' | 'mist'
  process: string
  altitude: string
}

export const products = catalogData as Product[]

export function getProductBySlug(slug: string | undefined) {
  return products.find((product) => product.slug === slug)
}
