import { beforeEach, describe, expect, it } from 'vitest'
import type { BaseQueryApi } from '@reduxjs/toolkit/query/react'
import { demoBaseQuery } from '@/demo/mock-backend'
import { DEMO_QR_TOKEN } from '@/demo/demo-mode'
import type { TableOrderDto } from '@/features/order/order-api'

const base = `/public/tables/${DEMO_QR_TOKEN}`
const call = (args: Parameters<typeof demoBaseQuery>[0]) =>
  demoBaseQuery(args, {} as BaseQueryApi, {}) as Promise<{
    data?: unknown
    error?: { status: number }
  }>

describe('demoBaseQuery', () => {
  beforeEach(() => sessionStorage.clear())

  it('serves the seeded bill and the menu', async () => {
    const order = (await call(`${base}/order`)).data as TableOrderDto
    expect(order.order?.items.length).toBeGreaterThan(0)
    expect(order.order?.status).toBe('OPEN')
    const menu = (await call(`${base}/menu`)).data as unknown[]
    expect(menu.length).toBeGreaterThan(0)
  })

  it('adds ordered dishes to the bill', async () => {
    const before = (await call(`${base}/order`)).data as TableOrderDto
    const after = (
      await call({
        url: `${base}/order/items`,
        method: 'POST',
        body: { items: [{ menuItemId: 'dish-ayran', quantity: 2 }] },
      })
    ).data as TableOrderDto
    expect(after.order!.totalAmount).toBeCloseTo(before.order!.totalAmount + 5)
  })

  it('settles the bill with a full payment and reports success', async () => {
    const checkout = (
      await call({
        url: `${base}/payment/full/checkout`,
        method: 'POST',
        body: { tipAmount: 2 },
      })
    ).data as { transactionId: string; paymentUrl: string }
    expect(checkout.paymentUrl).toContain('payment/result?tx=')

    const status = (await call(`/public/payments/${checkout.transactionId}`))
      .data as { status: string }
    expect(status.status).toBe('SUCCESS')
    const order = (await call(`${base}/order`)).data as TableOrderDto
    expect(order.order?.status).toBe('PAID')
    expect(order.order?.outstanding).toBe(0)
  })

  it('splits the bill equally until the last part pays the rest', async () => {
    const pay = () =>
      call({
        url: `${base}/payment/equal/checkout`,
        method: 'POST',
        body: { parts: 3, partsToPay: 1, tipAmount: null },
      })
    await pay()
    await pay()
    await pay()
    const order = (await call(`${base}/order`)).data as TableOrderDto
    expect(order.order?.equalSplit).toEqual({ totalParts: 3, paidParts: 3 })
    expect(order.order?.outstanding).toBe(0)
  })

  it('splits what is left after an item payment, like the backend', async () => {
    const before = (await call(`${base}/order`)).data as TableOrderDto
    await call({
      url: `${base}/payment/items/checkout`,
      method: 'POST',
      body: { itemIds: ['line-2'], tipAmount: null },
    })
    const left = before.order!.totalAmount - 18
    const quote = (await call(`${base}/payment/equal?parts=2&partsToPay=1`))
      .data as { amount: number }
    expect(quote.amount).toBeCloseTo(left / 2)
  })

  it('refuses another part count once a share is paid', async () => {
    await call({
      url: `${base}/payment/equal/checkout`,
      method: 'POST',
      body: { parts: 3, partsToPay: 1, tipAmount: null },
    })
    const result = await call(`${base}/payment/equal?parts=2&partsToPay=1`)
    expect(result.error?.status).toBe(409)
  })

  it('answers 404 for an unknown table token', async () => {
    const result = await call('/public/tables/other/order')
    expect(result.error?.status).toBe(404)
  })
})
