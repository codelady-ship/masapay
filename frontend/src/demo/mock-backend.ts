import type {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react'
import type { TableOrderDto } from '@/features/order/order-api'
import {
  DEMO_QR_TOKEN,
  DEMO_RESTAURANT_ID,
  DEMO_TABLE_ID,
} from '@/demo/demo-mode'

// In-browser stand-in for the customer API, used only by the static demo build.
// It answers the same URLs as the Spring Boot backend with made-up data, keeps
// the demo bill in sessionStorage (so it survives the "payment" page reload) and
// never talks to Payriff: a checkout is marked paid at once.

const STORAGE_KEY = 'masapay-demo-state'
const CURRENCY = 'AZN'

interface Dish {
  id: string
  name: string
  description: string | null
  price: number
  components: { name: string; quantity: number }[]
}

const MENU: { id: string; name: string; items: Dish[] }[] = [
  {
    id: 'cat-main',
    name: 'Əsas yeməklər',
    items: [
      {
        id: 'dish-dolma',
        name: 'Yarpaq dolması',
        description: 'Qatıqla',
        price: 9.5,
        components: [],
      },
      {
        id: 'dish-plov',
        name: 'Şah plov',
        description: 'Lavaşda bişmiş plov',
        price: 18,
        components: [],
      },
      {
        id: 'dish-kabab',
        name: 'Lülə kabab',
        description: 'Sumaq və soğanla',
        price: 8,
        components: [],
      },
    ],
  },
  {
    id: 'cat-soup',
    name: 'Şorbalar',
    items: [
      {
        id: 'dish-dushbara',
        name: 'Düşbərə',
        description: null,
        price: 6,
        components: [],
      },
      {
        id: 'dish-merci',
        name: 'Mərci şorbası',
        description: null,
        price: 4.5,
        components: [],
      },
    ],
  },
  {
    id: 'cat-drinks',
    name: 'İçkilər',
    items: [
      {
        id: 'dish-tea',
        name: 'Çay dəsti',
        description: 'Limon və mürəbbə ilə',
        price: 7,
        components: [],
      },
      {
        id: 'dish-ayran',
        name: 'Ayran',
        description: null,
        price: 2.5,
        components: [],
      },
    ],
  },
]

const ALL_DISHES = MENU.flatMap((category) => category.items)

interface Line {
  id: string
  menuItemId: string
  name: string
  quantity: number
  unitPrice: number
  paid: boolean
  source: 'STAFF' | 'CUSTOMER'
  addedAt: string
}

interface Payment {
  id: string
  amount: number
}

interface DemoState {
  lines: Line[]
  paidAmount: number
  equalSplit: { totalParts: number; paidParts: number } | null
  payments: Payment[]
  nextId: number
}

const round2 = (n: number) => Math.round(n * 100) / 100

function initialState(): DemoState {
  const now = new Date().toISOString()
  const line = (id: string, menuItemId: string, quantity: number): Line => {
    const dish = ALL_DISHES.find((d) => d.id === menuItemId)!
    return {
      id,
      menuItemId,
      name: dish.name,
      quantity,
      unitPrice: dish.price,
      paid: false,
      source: 'STAFF',
      addedAt: now,
    }
  }
  return {
    lines: [
      line('line-1', 'dish-dolma', 2),
      line('line-2', 'dish-plov', 1),
      line('line-3', 'dish-dushbara', 2),
      line('line-4', 'dish-tea', 1),
    ],
    paidAmount: 0,
    equalSplit: null,
    payments: [],
    nextId: 5,
  }
}

function load(): DemoState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as DemoState
  } catch {
    // Storage blocked or corrupt: start from the seeded bill.
  }
  return initialState()
}

function save(state: DemoState) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Without storage the demo still works until the next page load.
  }
}

const lineTotal = (line: Line) => round2(line.unitPrice * line.quantity)
const total = (s: DemoState) =>
  round2(s.lines.reduce((sum, l) => sum + lineTotal(l), 0))
const outstanding = (s: DemoState) =>
  Math.max(0, round2(total(s) - s.paidAmount))

function toDto(s: DemoState): TableOrderDto {
  const totalAmount = total(s)
  const settled = totalAmount > 0 && outstanding(s) === 0
  return {
    tableId: DEMO_TABLE_ID,
    tableLabel: 'Masa 7',
    restaurantId: DEMO_RESTAURANT_ID,
    restaurantName: 'Demo Restoran',
    currency: CURRENCY,
    serviceChargePercent: null,
    order: {
      orderId: 'demo-order-1',
      status: settled ? 'PAID' : 'OPEN',
      totalAmount,
      paidAmount: round2(s.paidAmount),
      outstanding: outstanding(s),
      items: s.lines.map((l) => ({
        id: l.id,
        name: l.name,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        totalPrice: lineTotal(l),
        paid: l.paid,
        kitchenStatus: l.source === 'CUSTOMER' ? 'NEW' : 'READY',
        source: l.source,
        addedBy: l.source === 'STAFF' ? 'Ofisiant Aysel' : null,
        addedAt: l.addedAt,
        menuItemId: l.menuItemId,
      })),
      equalSplit: s.equalSplit,
      serviceCharge: null,
    },
  }
}

function equalShare(s: DemoState, parts: number, partsToPay: number) {
  const split = s.equalSplit ?? { totalParts: parts, paidParts: 0 }
  const left = split.totalParts - split.paidParts
  const pay = Math.min(partsToPay, left)
  // The last parts take whatever is left, so rounding never leaves a qəpik.
  const amount =
    pay >= left ? outstanding(s) : round2((total(s) / split.totalParts) * pay)
  return { amount, split, pay }
}

function checkout(s: DemoState, amount: number, tip: number | null) {
  const id = `demo-tx-${s.nextId++}`
  s.paidAmount = round2(s.paidAmount + amount)
  s.payments.push({ id, amount: round2(amount + (tip ?? 0)) })
  save(s)
  return {
    transactionId: id,
    paymentUrl: `${import.meta.env.BASE_URL}payment/result?tx=${id}`,
  }
}

const notFound = {
  error: { status: 404, data: { message: 'Not found' } } as FetchBaseQueryError,
}

function handle(
  method: string,
  path: string,
  query: URLSearchParams,
  body: Record<string, unknown> | undefined,
): { data: unknown } | { error: FetchBaseQueryError } {
  const paymentMatch = path.match(/^\/public\/payments\/([^/]+)$/)
  if (paymentMatch) {
    const s = load()
    const payment = s.payments.find(
      (p) => p.id === decodeURIComponent(paymentMatch[1]),
    )
    if (!payment) return notFound
    return {
      data: {
        transactionId: payment.id,
        status: 'SUCCESS',
        amount: payment.amount,
        currency: CURRENCY,
        orderStatus: outstanding(s) === 0 ? 'PAID' : 'OPEN',
        restaurantId: DEMO_RESTAURANT_ID,
        tableId: DEMO_TABLE_ID,
        qrToken: DEMO_QR_TOKEN,
      },
    }
  }

  const prefix = `/public/tables/${DEMO_QR_TOKEN}`
  if (!path.startsWith(prefix)) return notFound
  const rest = path.slice(prefix.length)
  const s = load()
  const tip = typeof body?.tipAmount === 'number' ? body.tipAmount : null

  switch (`${method} ${rest}`) {
    case 'GET /order':
      return { data: toDto(s) }
    case 'GET /menu':
      return { data: MENU }
    case 'POST /order/items': {
      const items = (body?.items ?? []) as {
        menuItemId: string
        quantity: number
      }[]
      for (const item of items) {
        const dish = ALL_DISHES.find((d) => d.id === item.menuItemId)
        if (!dish) return notFound
        s.lines.push({
          id: `line-${s.nextId++}`,
          menuItemId: dish.id,
          name: dish.name,
          quantity: item.quantity,
          unitPrice: dish.price,
          paid: false,
          source: 'CUSTOMER',
          addedAt: new Date().toISOString(),
        })
      }
      save(s)
      return { data: toDto(s) }
    }
    case 'GET /payment/full':
      return { data: { amount: outstanding(s), currency: CURRENCY } }
    case 'POST /payment/full/checkout': {
      const amount = outstanding(s)
      s.lines.forEach((l) => (l.paid = true))
      return { data: checkout(s, amount, tip) }
    }
    case 'GET /payment/equal': {
      const { amount, split } = equalShare(
        s,
        Number(query.get('parts')),
        Number(query.get('partsToPay')),
      )
      return {
        data: {
          amount,
          currency: CURRENCY,
          totalParts: split.totalParts,
          paidParts: split.paidParts,
        },
      }
    }
    case 'POST /payment/equal/checkout': {
      const { amount, split, pay } = equalShare(
        s,
        Number(body?.parts),
        Number(body?.partsToPay),
      )
      s.equalSplit = {
        totalParts: split.totalParts,
        paidParts: split.paidParts + pay,
      }
      return { data: checkout(s, amount, tip) }
    }
    case 'GET /payment/items': {
      const ids = query.getAll('itemIds')
      const amount = s.lines
        .filter((l) => ids.includes(l.id) && !l.paid)
        .reduce((sum, l) => sum + lineTotal(l), 0)
      return { data: { amount: round2(amount), currency: CURRENCY } }
    }
    case 'POST /payment/items/checkout': {
      const ids = (body?.itemIds ?? []) as string[]
      const chosen = s.lines.filter((l) => ids.includes(l.id) && !l.paid)
      chosen.forEach((l) => (l.paid = true))
      const amount = chosen.reduce((sum, l) => sum + lineTotal(l), 0)
      return { data: checkout(s, round2(amount), tip) }
    }
    default:
      return notFound
  }
}

/** RTK Query base query that answers from the demo data instead of the network. */
export const demoBaseQuery: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args) => {
  const fetchArgs: FetchArgs = typeof args === 'string' ? { url: args } : args
  const url = new URL(fetchArgs.url, 'http://demo.local')
  const params = (fetchArgs.params ?? {}) as Record<string, unknown>
  Object.entries(params).forEach(([key, value]) =>
    url.searchParams.append(key, String(value)),
  )
  // A short pause so loading states are visible, as with a real network.
  await new Promise((resolve) => setTimeout(resolve, 250))
  return handle(
    (fetchArgs.method ?? 'GET').toUpperCase(),
    url.pathname,
    url.searchParams,
    fetchArgs.body as Record<string, unknown> | undefined,
  )
}
