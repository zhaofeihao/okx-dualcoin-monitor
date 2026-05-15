import { describe, expect, it } from "vitest";
import {
  fetchBinanceFundingRateSnapshots,
  filterBinancePerpetualSymbols,
  normalizeBinanceFundingRate
} from "../src/binanceFundingRateApi.js";
import type { BinancePremiumIndexRow, BinanceSymbolInfo } from "../src/types.js";

const symbol: BinanceSymbolInfo = {
  symbol: "BTCUSDT",
  pair: "BTCUSDT",
  contractType: "PERPETUAL",
  status: "TRADING",
  baseAsset: "BTC",
  quoteAsset: "USDT",
  marginAsset: "USDT"
};

const fundingRow: BinancePremiumIndexRow = {
  symbol: "BTCUSDT",
  markPrice: "95000.00000000",
  indexPrice: "94980.00000000",
  estimatedSettlePrice: "94970.00000000",
  lastFundingRate: "0.0035",
  interestRate: "0.00010000",
  nextFundingTime: 1778774400000,
  time: 1778724613357
};

describe("binanceFundingRateApi", () => {
  it("filters trading USDT perpetual symbols", () => {
    const symbols = filterBinancePerpetualSymbols([
      symbol,
      { ...symbol, symbol: "ETHUSDC", pair: "ETHUSDC", quoteAsset: "USDC", marginAsset: "USDC" },
      { ...symbol, symbol: "SOLUSDT_260626", pair: "SOLUSDT", contractType: "CURRENT_QUARTER" },
      { ...symbol, symbol: "DOGEUSDT", pair: "DOGEUSDT", status: "SETTLING" }
    ]);

    expect(symbols).toEqual([symbol]);
  });

  it("normalizes Binance decimal funding rates to percentages", () => {
    expect(normalizeBinanceFundingRate(fundingRow, symbol)).toMatchObject({
      exchange: "BINANCE",
      instId: "BTCUSDT",
      baseCcy: "BTC",
      quoteCcy: "USDT",
      fundingRate: 0.0035,
      fundingRatePct: 0.35,
      nextFundingRate: null,
      nextFundingRatePct: null,
      fundingTime: 1778774400000,
      nextFundingTime: 1778774400000,
      method: "premium_index",
      ts: 1778724613357
    });
  });

  it("fetches funding rates for eligible Binance symbols", async () => {
    const calls: string[] = [];
    const client = {
      get: async (path: string) => {
        calls.push(path);
        if (path === "/fapi/v1/exchangeInfo") {
          return {
            symbols: [
              symbol,
              { ...symbol, symbol: "ETHUSDT", pair: "ETHUSDT", baseAsset: "ETH" },
              { ...symbol, symbol: "SOLUSDC", pair: "SOLUSDC", baseAsset: "SOL", quoteAsset: "USDC" }
            ]
          };
        }
        return [
          fundingRow,
          { ...fundingRow, symbol: "ETHUSDT", lastFundingRate: "-0.0042" },
          { ...fundingRow, symbol: "SOLUSDC", lastFundingRate: "0.009" }
        ];
      }
    };

    const snapshots = await fetchBinanceFundingRateSnapshots(client as never, "USDT");

    expect(snapshots.map((snapshot) => snapshot.instId)).toEqual(["BTCUSDT", "ETHUSDT"]);
    expect(snapshots.map((snapshot) => snapshot.fundingRatePct)).toEqual([0.35, -0.42]);
    expect(calls).toEqual(["/fapi/v1/exchangeInfo", "/fapi/v1/premiumIndex"]);
  });
});
