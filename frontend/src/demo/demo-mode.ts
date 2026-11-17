// Static demo build (GitHub Pages): no backend, no Payriff, no real money.
// Turned on at build time with VITE_DEMO=true; a normal build never sets it, so
// every demo branch below is removed from the production bundle.

export const DEMO = import.meta.env.VITE_DEMO === 'true'

/** The one table the demo knows about. */
export const DEMO_QR_TOKEN = '00000000-0000-4000-8000-000000000001'
export const DEMO_RESTAURANT_ID = 'demo-restoran'
export const DEMO_TABLE_ID = 'masa-7'

/** In-app path of the demo table, without the deploy base. */
export const DEMO_TABLE_PATH = `/r/${DEMO_RESTAURANT_ID}/t/${DEMO_TABLE_ID}?token=${DEMO_QR_TOKEN}`

/** Router basename: Vite's BASE_URL ("/masapay/") without the trailing slash. */
export const ROUTER_BASENAME =
  import.meta.env.BASE_URL.replace(/\/$/, '') || undefined
