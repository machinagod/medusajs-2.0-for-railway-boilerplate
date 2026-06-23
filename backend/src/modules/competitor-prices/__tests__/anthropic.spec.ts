import { createAnthropicDiscoveryAgent } from "../discovery/anthropic"

const mockFetch = (text: string, ok = true, status = 200) =>
  jest.fn(async () => ({
    ok,
    status,
    json: async () => ({
      content: [
        { type: "text", text },
        { type: "tool_use", name: "web_search" }, // ignored by ask()
      ],
    }),
    text: async () => "err-body",
  }))

const agent = () =>
  createAnthropicDiscoveryAgent({ apiKey: "k", model: "claude-test", maxResults: 5 })

const bodyOf = (call: number) =>
  JSON.parse((global.fetch as jest.Mock).mock.calls[call][1].body)

describe("createAnthropicDiscoveryAgent", () => {
  afterEach(() => {
    delete (global as any).fetch
  })

  it("exposes the anthropic key", () => {
    expect(agent().key).toBe("anthropic")
  })

  it("findStoresForProduct parses a fenced JSON array and slugifies handles", async () => {
    ;(global as any).fetch = mockFetch(
      'sure:\n```json\n[{"competitorHandle":"Foo Bar","url":"http://a","price":"1,00","confidence":80}]\n```'
    )
    const out = await agent().findStoresForProduct({ productId: "p", title: "T" })
    expect(out).toEqual([
      expect.objectContaining({
        competitorHandle: "foo-bar",
        url: "http://a",
        price: "1,00",
        currencyCode: "EUR",
        confidence: 80,
      }),
    ])
    expect(bodyOf(0).tools[0].name).toBe("web_search")
  })

  it("discoverCatalog stamps the competitor handle from the input", async () => {
    ;(global as any).fetch = mockFetch('[{"url":"http://b","confidence":"x"}]')
    const out = await agent().discoverCatalog({
      competitorId: "c",
      competitorHandle: "acme",
      baseUrl: "http://acme",
      knownUrls: ["http://b/known"],
    })
    expect(out[0]).toMatchObject({ competitorHandle: "acme", url: "http://b" })
    expect(out[0].confidence).toBeUndefined()
  })

  it("generateParser returns a spec and skips web search when HTML is supplied", async () => {
    ;(global as any).fetch = mockFetch(
      '```json\n{"scraperKey":"config-selectors","hints":{"price":".p"}}\n```'
    )
    const spec = await agent().generateParser({
      competitorHandle: "acme",
      sampleUrl: "http://x",
      sampleHtml: "<html>price</html>",
    })
    expect(spec).toMatchObject({ scraperKey: "config-selectors", hints: { price: ".p" } })
    expect(bodyOf(0).tools).toBeUndefined()
  })

  it("generateParser returns null without a price selector", async () => {
    ;(global as any).fetch = mockFetch('{"hints":{}}')
    expect(
      await agent().generateParser({ competitorHandle: "a", sampleUrl: "u" })
    ).toBeNull()
  })

  it("returns [] when the response has no JSON", async () => {
    ;(global as any).fetch = mockFetch("no structured data here")
    expect(await agent().findStoresForProduct({ productId: "p", title: "T" })).toEqual([])
  })

  it("returns [] when the JSON is malformed", async () => {
    ;(global as any).fetch = mockFetch("```json\n{not valid}\n```")
    expect(
      await agent().discoverCatalog({ competitorId: "c", competitorHandle: "h", knownUrls: [] })
    ).toEqual([])
  })

  it("uses default model/maxResults and normalizes a fully-populated listing", async () => {
    ;(global as any).fetch = mockFetch(
      '[{"competitorHandle":"Acme Co","competitorName":"Acme","competitorBaseUrl":"http://acme","url":"http://acme/p","price":"2,50","currencyCode":"GBP","characteristics":{"size":"5L"},"confidence":90}]'
    )
    const a = createAnthropicDiscoveryAgent({ apiKey: "k" }) // no model/maxResults
    const out = await a.findStoresForProduct({ productId: "p", title: "T" })
    expect(out[0]).toMatchObject({
      competitorHandle: "acme-co",
      competitorName: "Acme",
      currencyCode: "GBP",
      characteristics: { size: "5L" },
    })
    expect(bodyOf(0).model).toBe("claude-sonnet-4-6")
  })

  it("throws on a non-OK API response", async () => {
    ;(global as any).fetch = mockFetch("", false, 500)
    await expect(
      agent().findStoresForProduct({ productId: "p", title: "T" })
    ).rejects.toThrow(/anthropic 500/)
  })
})
