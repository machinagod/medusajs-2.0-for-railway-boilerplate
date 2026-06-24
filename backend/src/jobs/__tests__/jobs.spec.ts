jest.mock("../../workflows/competitor-prices/scrape", () => ({ runCompetitorScrape: jest.fn() }))
jest.mock("../../workflows/competitor-prices/discovery-catalog", () => ({ runCatalogDiscovery: jest.fn() }))
jest.mock("../../workflows/competitor-prices/discovery-product", () => ({ runProductDiscovery: jest.fn() }))
jest.mock("../../modules/competitor-prices/discovery/registry", () => ({ isDiscoveryConfigured: jest.fn() }))
jest.mock("../../workflows/competitor-prices/snapshot-our-prices", () => ({ runSnapshotOurPrices: jest.fn() }))

import snapshotJob from "../snapshot-our-prices"
import { runSnapshotOurPrices } from "../../workflows/competitor-prices/snapshot-our-prices"
import scrapeJob, { config as scrapeConfig } from "../scrape-competitor-prices"
import catalogJob, { config as catalogConfig } from "../discover-competitor-catalog"
import productJob, { config as productConfig } from "../discover-product-competitors"
import { runCompetitorScrape } from "../../workflows/competitor-prices/scrape"
import { runCatalogDiscovery } from "../../workflows/competitor-prices/discovery-catalog"
import { runProductDiscovery } from "../../workflows/competitor-prices/discovery-product"
import { isDiscoveryConfigured } from "../../modules/competitor-prices/discovery/registry"

const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() }
const okContainer = { resolve: (n: string) => (n === "logger" ? logger : {}) }
const noModuleContainer = {
  resolve: (n: string) => {
    if (n === "logger") return logger
    throw new Error("not registered")
  },
}

describe("scrape-competitor-prices job", () => {
  it("skips when the module is not registered", async () => {
    await scrapeJob(noModuleContainer as any)
    expect(runCompetitorScrape).not.toHaveBeenCalled()
  })

  it("runs the scrape workflow", async () => {
    ;(runCompetitorScrape as jest.Mock).mockResolvedValue({})
    await scrapeJob(okContainer as any)
    expect(runCompetitorScrape).toHaveBeenCalled()
  })

  it("logs errors from the workflow", async () => {
    ;(runCompetitorScrape as jest.Mock).mockRejectedValue(new Error("boom"))
    await scrapeJob(okContainer as any)
    expect(logger.error).toHaveBeenCalled()
  })
})

describe("snapshot-our-prices job", () => {
  it("skips when the module is not registered", async () => {
    await snapshotJob(noModuleContainer as any)
    expect(runSnapshotOurPrices).not.toHaveBeenCalled()
  })

  it("runs the snapshot workflow", async () => {
    ;(runSnapshotOurPrices as jest.Mock).mockResolvedValue({ considered: 0, snapshotted: 0 })
    await snapshotJob(okContainer as any)
    expect(runSnapshotOurPrices).toHaveBeenCalled()
  })

  it("logs errors from the snapshot workflow", async () => {
    ;(runSnapshotOurPrices as jest.Mock).mockRejectedValue(new Error("boom"))
    await snapshotJob(okContainer as any)
    expect(logger.error).toHaveBeenCalled()
  })

  it("skips overlapping ticks (running guard)", async () => {
    let release: () => void = () => {}
    ;(runCompetitorScrape as jest.Mock).mockReturnValue(new Promise<void>((r) => (release = r)))
    const p1 = scrapeJob(okContainer as any)
    await Promise.resolve()
    await scrapeJob(okContainer as any) // sees running=true → returns
    expect(runCompetitorScrape).toHaveBeenCalledTimes(1)
    release()
    await p1
  })

  it("exposes a schedule", () => {
    expect(scrapeConfig).toMatchObject({ name: "scrape-competitor-prices", schedule: "*/15 * * * *" })
  })
})

describe("discovery jobs", () => {
  it("product discovery skips when no LLM agent is configured", async () => {
    ;(isDiscoveryConfigured as jest.Mock).mockReturnValue(false)
    await productJob(okContainer as any)
    expect(runProductDiscovery).not.toHaveBeenCalled()
  })

  it("catalog discovery runs deterministically, with no LLM gate", async () => {
    ;(isDiscoveryConfigured as jest.Mock).mockReturnValue(false)
    ;(runCatalogDiscovery as jest.Mock).mockResolvedValue({})
    await catalogJob(okContainer as any)
    expect(runCatalogDiscovery).toHaveBeenCalled()
  })

  it("skip when the module is not registered", async () => {
    await catalogJob(noModuleContainer as any)
    await productJob(noModuleContainer as any)
    expect(runCatalogDiscovery).not.toHaveBeenCalled()
  })

  it("run their workflows when configured", async () => {
    ;(isDiscoveryConfigured as jest.Mock).mockReturnValue(true)
    ;(runCatalogDiscovery as jest.Mock).mockResolvedValue({})
    ;(runProductDiscovery as jest.Mock).mockResolvedValue({})
    await catalogJob(okContainer as any)
    await productJob(okContainer as any)
    expect(runCatalogDiscovery).toHaveBeenCalled()
    expect(runProductDiscovery).toHaveBeenCalled()
  })

  it("log workflow errors", async () => {
    ;(isDiscoveryConfigured as jest.Mock).mockReturnValue(true)
    ;(runCatalogDiscovery as jest.Mock).mockRejectedValue(new Error("x"))
    ;(runProductDiscovery as jest.Mock).mockRejectedValue(new Error("y"))
    await catalogJob(okContainer as any)
    await productJob(okContainer as any)
    expect(logger.error).toHaveBeenCalled()
  })

  it("skip overlapping ticks", async () => {
    ;(isDiscoveryConfigured as jest.Mock).mockReturnValue(true)
    let release: () => void = () => {}
    ;(runCatalogDiscovery as jest.Mock).mockReturnValue(new Promise<void>((r) => (release = r)))
    const p1 = catalogJob(okContainer as any)
    await Promise.resolve()
    await catalogJob(okContainer as any)
    expect(runCatalogDiscovery).toHaveBeenCalledTimes(1)
    release()
    await p1
  })

  it("expose schedules", () => {
    expect(catalogConfig).toMatchObject({ name: "discover-competitor-catalog", schedule: "0 3 * * *" })
    expect(productConfig).toMatchObject({ name: "discover-product-competitors", schedule: "0 4 * * *" })
  })
})
