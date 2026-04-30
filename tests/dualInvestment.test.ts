import { describe, expect, it } from "vitest";
import {
  calculateDistanceToSpotPct,
  calculateTermDays,
  normalizeDualInvestmentProduct,
  normalizeOkxApr
} from "../src/dualInvestment.js";

const rawProduct = {
  absYield: "0.00232413",
  annualizedYield: "0.865",
  baseCcy: "ETH",
  quoteCcy: "USDT",
  expTime: String(Date.parse("2026-03-27T00:00:00.000Z")),
  interestAccrualTime: "1773244800000",
  listTime: "1743150759000",
  maxSize: "6000000",
  minSize: "10",
  notionalCcy: "USDT",
  optType: "P",
  productId: "ETH-USDT-260327-2800-P",
  quoteTime: "1773243808703",
  redeemEndTime: "1774594800000",
  redeemStartTime: "1773244800000",
  stepSz: "1",
  tradeEndTime: "1774584000000",
  strike: "2800",
  uly: "ETH-USD"
};

describe("dual investment normalization", () => {
  it("normalizes OKX annualized yield ratios to APR percentages", () => {
    expect(normalizeOkxApr("0.865")).toBe(86.5);
    expect(normalizeOkxApr("69.65")).toBe(69.65);
  });

  it("calculates positive buy-low distance when strike is below spot", () => {
    expect(calculateDistanceToSpotPct(3000, 2800)).toBeCloseTo(6.6667, 4);
  });

  it("calculates term days from collection time to expiry", () => {
    const collectedAt = new Date("2026-03-20T00:00:00.000Z");
    const expiry = Date.parse("2026-03-27T00:00:00.000Z");

    expect(calculateTermDays(collectedAt, expiry)).toBe(7);
  });

  it("normalizes an OKX product into a quote snapshot", () => {
    const collectedAt = new Date("2026-03-20T00:00:00.000Z");
    const quote = normalizeDualInvestmentProduct(rawProduct, {
      collectedAt,
      spotPrice: 3000,
      direction: "buy_low"
    });

    expect(quote).toMatchObject({
      exchange: "OKX",
      asset: "ETH",
      quote: "USDT",
      direction: "buy_low",
      productId: "ETH-USDT-260327-2800-P",
      strikePrice: 2800,
      spotPrice: 3000,
      apr: 86.5,
      estimatedReturn: 0.00232413,
      minAmount: 10,
      maxAmount: 6000000,
      notionalCcy: "USDT"
    });
    expect(quote.termDays).toBeCloseTo(7, 5);
    expect(quote.distanceToSpotPct).toBeCloseTo(6.6667, 4);
    expect(quote.rawPayload).toEqual(rawProduct);
  });
});
