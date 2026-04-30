import { describe, expect, it } from "vitest";
import {
  extractDualInvestmentProducts,
  fetchDualInvestmentQuotes
} from "../src/dualInvestmentApi.js";
import type { OkxDualInvestmentProduct } from "../src/types.js";

const product: OkxDualInvestmentProduct = {
  absYield: "0.002",
  annualizedYield: "0.5",
  baseCcy: "ETH",
  quoteCcy: "USDT",
  expTime: String(Date.parse("2026-05-07T08:00:00.000Z")),
  maxSize: "10000",
  minSize: "10",
  notionalCcy: "USDT",
  optType: "P",
  productId: "ETH-USDT-260507-2800-P",
  strike: "2800"
};

describe("dualInvestmentApi", () => {
  it("extracts products from the documented array response shape", () => {
    expect(extractDualInvestmentProducts([product])).toEqual([product]);
  });

  it("extracts products from the real OKX nested products response shape", () => {
    expect(extractDualInvestmentProducts({ products: [product] })).toEqual([product]);
  });

  it("throws a useful error for unexpected product response shapes", () => {
    expect(() => extractDualInvestmentProducts({ items: [product] })).toThrow(
      "Unexpected OKX dual investment products response shape"
    );
  });

  it("fetches and normalizes nested products", async () => {
    const client = {
      get: async () => ({ products: [product] })
    };

    const quotes = await fetchDualInvestmentQuotes({
      client: client as never,
      asset: "ETH",
      quote: "USDT",
      direction: "buy_low",
      spotPrice: 3000,
      collectedAt: new Date("2026-04-30T08:00:00.000Z")
    });

    expect(quotes).toHaveLength(1);
    expect(quotes[0]).toMatchObject({
      productId: "ETH-USDT-260507-2800-P",
      apr: 50,
      strikePrice: 2800
    });
  });
});
