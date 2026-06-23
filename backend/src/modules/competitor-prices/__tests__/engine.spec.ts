jest.mock("crawlee", () => {
  class CheerioCrawler {
    opts: any
    constructor(opts: any) {
      this.opts = opts
    }
    async run(requests: any[]) {
      const g = globalThis as any
      for (const r of requests) {
        if ((g.__failUrls || []).includes(r.url)) {
          this.opts.failedRequestHandler(
            { request: { url: r.url, userData: r.userData } },
            "__failError" in g ? g.__failError : new Error("net")
          )
          continue
        }
        const scripts: string[] = g.__scripts || []
        const $ = (arg: any) =>
          arg && arg.__txt !== undefined
            ? { text: () => arg.__txt }
            : { each: (cb: any) => scripts.forEach((s, i) => cb(i, { __txt: s })) }
        await this.opts.requestHandler({
          request: { url: r.url, userData: r.userData },
          $,
          body: g.__body,
        })
      }
    }
    async teardown() {
      ;(globalThis as any).__tornDown = true
    }
  }
  class Configuration {
    constructor(_opts: any) {}
  }
  return { CheerioCrawler, Configuration }
})

import { crawlTargets } from "../scrapers/engine"
import { registerScraper } from "../scrapers/registry"

beforeAll(() => {
  registerScraper({
    key: "echo",
    parse: (page) => ({ status: "ok", price: page.jsonLd.length, title: page.url }),
  })
  registerScraper({
    key: "boom",
    parse: () => {
      throw new Error("kaboom")
    },
  })
  registerScraper({
    key: "boomstr",
    parse: () => {
      throw "no-message" // non-Error throw
    },
  })
})

beforeEach(() => {
  const g = globalThis as any
  g.__scripts = []
  g.__failUrls = []
  g.__body = "<html></html>"
  g.__tornDown = false
})

const target = (id: string, scraperKey: string) => ({
  url: `http://x/${id}`,
  competitorId: "c",
  competitorProductId: id,
  scraperKey,
})

describe("crawlTargets", () => {
  it("returns an empty map (and skips Crawlee) when there are no targets", async () => {
    const res = await crawlTargets([])
    expect(res.size).toBe(0)
    expect((globalThis as any).__tornDown).toBe(false)
  })

  it("parses each target and collects JSON-LD, ignoring malformed blocks", async () => {
    ;(globalThis as any).__scripts = ['{"a":1}', "not json"]
    const res = await crawlTargets([target("m1", "echo")], { concurrency: 2 })
    expect(res.get("m1")).toMatchObject({ status: "ok", price: 1, title: "http://x/m1" })
    expect((globalThis as any).__tornDown).toBe(true)
  })

  it("captures a parser error as an error result (body as Buffer)", async () => {
    ;(globalThis as any).__body = Buffer.from("<html/>")
    const res = await crawlTargets([target("m2", "boom")])
    expect(res.get("m2")).toMatchObject({ status: "error", errorMessage: "kaboom" })
  })

  it("records failed requests via the failed handler", async () => {
    ;(globalThis as any).__failUrls = ["http://x/m3"]
    const res = await crawlTargets([target("m3", "echo")])
    expect(res.get("m3")).toMatchObject({ status: "error", errorMessage: "net" })
  })

  it("handles a non-string, non-Buffer body", async () => {
    ;(globalThis as any).__body = 123
    const res = await crawlTargets([target("m4", "echo")])
    expect(res.get("m4")?.status).toBe("ok")
  })

  it("falls back to a default message on a parser throw without a message", async () => {
    const res = await crawlTargets([target("m5", "boomstr")])
    expect(res.get("m5")).toMatchObject({ status: "error", errorMessage: "parse failed" })
  })

  it("falls back to a default message when the failed-request error has none", async () => {
    ;(globalThis as any).__failUrls = ["http://x/m6"]
    ;(globalThis as any).__failError = null
    const res = await crawlTargets([target("m6", "echo")])
    expect(res.get("m6")).toMatchObject({ status: "error", errorMessage: "request failed" })
    delete (globalThis as any).__failError
  })

  it("honours explicit crawl options and skips empty script blocks", async () => {
    ;(globalThis as any).__scripts = ["", '{"ok":1}']
    const res = await crawlTargets([target("m7", "echo")], {
      concurrency: 1,
      maxRetries: 0,
      requestTimeoutSecs: 10,
    })
    expect(res.get("m7")).toMatchObject({ status: "ok", price: 1 })
  })
})
