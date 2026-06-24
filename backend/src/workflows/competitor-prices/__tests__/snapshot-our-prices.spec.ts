import { runSnapshotOurPrices } from "../snapshot-our-prices"

const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() }

const makeQuery = () => ({
  graph: jest
    .fn()
    // products → PVP1 via calculated_price
    .mockResolvedValueOnce({
      data: [
        { id: "p1", title: "P1", variants: [{ id: "v1", sku: "S1", calculated_price: { calculated_amount: 82.17 } }] },
        { id: "p2", title: "P2", variants: [{ id: "v2", sku: "S2", calculated_price: { calculated_amount: 50 } }] },
      ],
    })
    // price lists → PVP2 + cost
    .mockResolvedValueOnce({
      data: [
        { title: "Moloni PVP2", prices: [{ amount: 70, currency_code: "eur", price_set: { variant: { id: "v1" } } }] },
        { title: "Moloni Cost", prices: [{ amount: 55, currency_code: "eur", price_set: { variant: { id: "v1" } } }] },
      ],
    }),
})

const makeContainer = (svc: any, query: any) => ({
  resolve: (n: string) => (n === "logger" ? logger : n === "query" ? query : svc),
})

describe("runSnapshotOurPrices", () => {
  it("no watches → nothing snapshotted", async () => {
    const svc = { listProductWatches: jest.fn().mockResolvedValue([]) }
    const r = await runSnapshotOurPrices(makeContainer(svc, makeQuery()) as any)
    expect(r).toEqual({ considered: 0, snapshotted: 0 })
  })

  it("inserts a row only for products whose price changed since last snapshot", async () => {
    const svc = {
      listProductWatches: jest.fn().mockResolvedValue([{ product_id: "p1" }, { product_id: "p2" }]),
      // p1's last snapshot matches its current PVP1/PVP2/cost (8217/7000/5500) → unchanged.
      listProductPriceHistories: jest
        .fn()
        .mockResolvedValue([{ product_id: "p1", pvp1: 8217, pvp2: 7000, cost: 5500 }]),
      createProductPriceHistories: jest.fn().mockResolvedValue(undefined),
    }
    const r = await runSnapshotOurPrices(makeContainer(svc, makeQuery()) as any)
    expect(r).toMatchObject({ considered: 2, snapshotted: 1 })
    const created = svc.createProductPriceHistories.mock.calls[0][0]
    expect(created).toHaveLength(1)
    expect(created[0]).toMatchObject({ product_id: "p2", pvp1: 5000 }) // p2 is new
  })
})
