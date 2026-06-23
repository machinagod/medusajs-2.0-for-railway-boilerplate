import { describe, it, expect } from "vitest"
import { convertToLocale } from "../money"
import { isEmpty, isObject, isArray } from "../isEmpty"
import { getPercentageDiff } from "../get-precentage-diff"
import repeat from "../repeat"
import compareAddresses from "../compare-addresses"

describe("convertToLocale", () => {
  it("formats an amount in the given currency", () => {
    expect(convertToLocale({ amount: 12.5, currency_code: "EUR", locale: "en-US" })).toBe("€12.50")
  })
  it("falls back to the raw amount when no currency", () => {
    expect(convertToLocale({ amount: 12.5, currency_code: "" })).toBe("12.5")
  })
})

describe("isEmpty helpers", () => {
  it("detects empty values", () => {
    expect(isEmpty(null)).toBe(true)
    expect(isEmpty(undefined)).toBe(true)
    expect(isEmpty({})).toBe(true)
    expect(isEmpty([])).toBe(true)
    expect(isEmpty("  ")).toBe(true)
  })
  it("detects non-empty values", () => {
    expect(isEmpty({ a: 1 })).toBe(false)
    expect(isEmpty([1])).toBe(false)
    expect(isEmpty("x")).toBe(false)
  })
  it("isObject / isArray", () => {
    expect(isObject({})).toBe(true)
    expect(isObject("x")).toBe(false)
    expect(isArray([])).toBe(true)
    expect(isArray({})).toBe(false)
  })
})

describe("getPercentageDiff", () => {
  it("computes the percentage decrease", () => {
    expect(getPercentageDiff(100, 80)).toBe("20")
    expect(getPercentageDiff(50, 50)).toBe("0")
  })
})

describe("repeat", () => {
  it("returns an index array", () => {
    expect(repeat(3)).toEqual([0, 1, 2])
    expect(repeat(0)).toEqual([])
  })
})

describe("compareAddresses", () => {
  const a = { first_name: "A", last_name: "B", city: "Lisboa", extra: "ignored" }
  it("is true for addresses equal on the compared fields", () => {
    expect(compareAddresses(a, { ...a, extra: "different" })).toBe(true)
  })
  it("is false when a compared field differs", () => {
    expect(compareAddresses(a, { ...a, city: "Porto" })).toBe(false)
  })
})
