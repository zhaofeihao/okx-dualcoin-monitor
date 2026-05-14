import { describe, expect, it, vi } from "vitest";
import {
  fetchOkxFundingRateSnapshots,
  filterUsdtLinearSwapInstruments,
  normalizeOkxFundingRate
} from "../src/okxFundingRateApi.js";
import type { OkxFundingRateRow, OkxSwapInstrument } from "../src/types.js";

const instrument: OkxSwapInstrument = {
  instType: "SWAP",
  instId: "BTC-USDT-SWAP",
  instFamily: "BTC-USDT",
  ctType: "linear",
  settleCcy: "USDT",
  state: "live"
};

const fundingRow: OkxFundingRateRow = {
  formulaType: "withRate",
  fundingRate: "0.0031",
  fundingTime: "1778745600000",
  instId: "BTC-USDT-SWAP",
  instType: "SWAP",
  method: "current_period",
  nextFundingRate: "-0.001",
  nextFundingTime: "1778774400000",
  ts: "1778724613357"
};

describe("okxFundingRateApi", () => {
  it("filters live USDT linear swap instruments", () => {
    const instruments = filterUsdtLinearSwapInstruments([
      instrument,
      { ...instrument, instId: "BTC-USD-SWAP", instFamily: "BTC-USD", settleCcy: "BTC" },
      { ...instrument, instId: "ETH-USDC-SWAP", instFamily: "ETH-USDC", settleCcy: "USDC" },
      { ...instrument, instId: "SOL-USDT-SWAP", ctType: "inverse" },
      { ...instrument, instId: "DOGE-USDT-SWAP", state: "suspend" }
    ]);

    expect(instruments).toEqual([instrument]);
  });

  it("normalizes OKX decimal funding rates to percentages", () => {
    expect(normalizeOkxFundingRate(fundingRow)).toMatchObject({
      exchange: "OKX",
      instId: "BTC-USDT-SWAP",
      baseCcy: "BTC",
      quoteCcy: "USDT",
      fundingRate: 0.0031,
      fundingRatePct: 0.31,
      nextFundingRate: -0.001,
      nextFundingRatePct: -0.1,
      fundingTime: 1778745600000,
      nextFundingTime: 1778774400000,
      method: "current_period",
      ts: 1778724613357
    });
  });

  it("fetches funding rates for eligible instruments and skips failed rows", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const calls: string[] = [];
    const client = {
      get: async (path: string, query: Record<string, string>) => {
        calls.push(`${path}?${new URLSearchParams(query).toString()}`);
        if (path === "/api/v5/public/instruments") {
          return [instrument, { ...instrument, instId: "ETH-USDT-SWAP", instFamily: "ETH-USDT" }];
        }
        if (query.instId === "ETH-USDT-SWAP") {
          throw new Error("temporary failure");
        }
        return [{ ...fundingRow, instId: query.instId }];
      }
    };

    const snapshots = await fetchOkxFundingRateSnapshots(client as never, "USDT");

    expect(snapshots.map((snapshot) => snapshot.instId)).toEqual(["BTC-USDT-SWAP"]);
    expect(consoleError).toHaveBeenCalledWith(
      "Failed to fetch funding rate for ETH-USDT-SWAP",
      expect.any(Error)
    );
    expect(calls).toEqual([
      "/api/v5/public/instruments?instType=SWAP",
      "/api/v5/public/funding-rate?instId=BTC-USDT-SWAP",
      "/api/v5/public/funding-rate?instId=ETH-USDT-SWAP"
    ]);
    consoleError.mockRestore();
  });
});
