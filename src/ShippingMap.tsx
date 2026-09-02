import { useEffect } from 'react'
import { MapPin } from 'lucide-react'
import { CircleMarker, MapContainer, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

type ShippingQuote = { region: string; price: number; eta: string; center: [number, number] }

function MapFocus({ center }: { center: [number, number] }) {
  const map = useMap()
  useEffect(() => { map.flyTo(center, 5, { duration: 1.4 }) }, [center, map])
  return null
}

export default function ShippingMap({ quote }: { quote: ShippingQuote | null }) {
  const center: [number, number] = quote?.center ?? [-38.42, -63.62]
  return (
    <div className="shipping-map" aria-label="Mapa orientativo del destino del envío">
      <MapContainer center={center} zoom={quote ? 5 : 3} scrollWheelZoom={false} zoomControl={false} attributionControl>
        <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapFocus center={center} />
        {quote && <CircleMarker center={center} radius={9} pathOptions={{ color: '#e9dec9', fillColor: '#b77a4e', fillOpacity: 1, weight: 3 }} />}
      </MapContainer>
      <span className="map-label"><MapPin size={13} /> {quote?.region ?? 'Ingresá tu código postal'}</span>
    </div>
  )
}
