import { describe, expect, it } from "vitest";
import { filterFundingRateAlerts } from "../src/fundingRate.js";
import type { FundingRateSnapshot } from "../src/types.js";

function snapshot(overrides: Partial<FundingRateSnapshot> = {}): FundingRateSnapshot {
  return {
    exchange: "OKX",
    instId: "BTC-USDT-SWAP",
    baseCcy: "BTC",
    quoteCcy: "USDT",
    fundingRate: 0.0042,
    fundingRatePct: 0.42,
    nextFundingRate: null,
    nextFundingRatePct: null,
    fundingTime: 1778745600000,
    nextFundingTime: 1778774400000,
    method: "current_period",
    ts: 1778724613357,
    rawPayload: {} as FundingRateSnapshot["rawPayload"],
    ...overrides
  };
}

describe("fundingRate", () => {
  it("filters by absolute funding rate and sorts strongest first", () => {
    const alerts = filterFundingRateAlerts(
      [
        snapshot({ instId: "BTC-USDT-SWAP", fundingRatePct: 0.31 }),
        snapshot({ instId: "ETH-USDT-SWAP", fundingRatePct: -0.82 }),
        snapshot({ instId: "SOL-USDT-SWAP", fundingRatePct: 0.29 }),
        snapshot({ instId: "DOGE-USDT-SWAP", fundingRatePct: 0.5 })
      ],
      { thresholdPct: 0.3, topN: 2 }
    );

    expect(alerts.map((alert) => alert.instId)).toEqual([
      "ETH-USDT-SWAP",
      "DOGE-USDT-SWAP"
    ]);
  });

  it("uses a strict greater-than threshold", () => {
    const alerts = filterFundingRateAlerts([snapshot({ fundingRatePct: -0.3 })], {
      thresholdPct: 0.3,
      topN: 20
    });

    expect(alerts).toEqual([]);
  });
});
