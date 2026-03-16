import type { Metadata, Viewport } from 'next'
import TaxiApp from './TaxiApp'

export const metadata: Metadata = {
  title: 'Kaskad Taxi',
  description: 'Заказ такси в VK Mini App',
}

export const viewport: Viewport = {
  themeColor: '#0f1117',
  userScalable: false,
  width: 'device-width',
  initialScale: 1,
}

export default function TaxiPage() {
  return <TaxiApp />
}
