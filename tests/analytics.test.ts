import { describe, expect, it } from "vitest";
import {
  buildAlertKey,
  calculateAprDeltaPct,
  calculateMean,
  calculateRankByApr,
  calculateStddev,
  calculateZScore,
  evaluateAlert,
  filterCandidates
} from "../src/analytics.js";
import type { DualInvestmentQuote, QuoteHistoryPoint, StrategyConfig } from "../src/types.js";

const strategy: StrategyConfig = {
  asset: "ETH",
  quote: "USDT",
  direction: "buy_low",
  acceptableStrikes: [2600, 2800],
  maxDistanceFromSpotPct: 12,
  minApr: 35,
  minTermDays: 1,
  maxTermDays: 14,
  alertZScore: 2.5,
  alertAprDeltaPct: 10,
  alertMeanMultiplier: 1.5,
  rankingTopN: 3
};

function quote(overrides: Partial<DualInvestmentQuote> = {}): DualInvestmentQuote {
  return {
    collectedAt: "2026-04-30T10:00:00.000Z",
    exchange: "OKX",
    asset: "ETH",
    quote: "USDT",
    direction: "buy_low",
    productId: "ETH-USDT-260507-2800-P",
    expTime: Date.parse("2026-05-07T08:00:00.000Z"),
    termDays: 7,
    strikePrice: 2800,
    spotPrice: 3012,
    apr: 86.5,
    estimatedReturn: 0.01,
    distanceToSpotPct: 7.04,
    minAmount: 10,
    maxAmount: 6000000,
    notionalCcy: "USDT",
    rawPayload: {} as DualInvestmentQuote["rawPayload"],
    ...overrides
  };
}

describe("analytics", () => {
  it("filters candidates by strategy thresholds", () => {
    const candidates = filterCandidates(
      [
        quote(),
        quote({ strikePrice: 2500 }),
        quote({ apr: 20 }),
        quote({ distanceToSpotPct: 15 }),
        quote({ termDays: 20 })
      ],
      strategy
    );

    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.strikePrice).toBe(2800);
  });

  it("allows any strike when acceptableStrikes is empty", () => {
    const candidates = filterCandidates([quote({ strikePrice: 2750 })], {
      ...strategy,
      acceptableStrikes: []
    });

    expect(candidates).toHaveLength(1);
  });

  it("calculates mean, population stddev, z-score, and APR delta", () => {
    expect(calculateMean([40, 50, 60])).toBe(50);
    expect(calculateStddev([40, 50, 60])).toBeCloseTo(8.165, 3);
    expect(calculateZScore(75, [40, 50, 60])).toBeCloseTo(3.062, 3);
    expect(calculateAprDeltaPct(86.5, 68.3)).toBeCloseTo(18.2, 1);
  });

  it("returns null z-score when history has no variance", () => {
    expect(calculateZScore(60, [50, 50, 50])).toBeNull();
  });

  it("ranks quotes by APR within an expiry", () => {
    const ranks = calculateRankByApr([
      quote({ productId: "a", apr: 40 }),
      quote({ productId: "b", apr: 90 }),
      quote({ productId: "c", apr: 70 })
    ]);

    expect(ranks.get("b")).toBe(1);
    expect(ranks.get("c")).toBe(2);
    expect(ranks.get("a")).toBe(3);
  });

  it("builds a deterministic hourly alert key for dedupe", () => {
    expect(buildAlertKey(quote(), "2026-04-30T10:13:00.000Z")).toBe(
      "OKX:ETH:USDT:buy_low:1778140800000:2800:2026-04-30T10"
    );
  });

  it("evaluates z-score and APR delta alert reasons", () => {
    const history: QuoteHistoryPoint[] = [
      { collectedAt: "2026-04-30T09:00:00.000Z", expTime: quote().expTime, strikePrice: 2800, apr: 40 },
      { collectedAt: "2026-04-30T09:15:00.000Z", expTime: quote().expTime, strikePrice: 2800, apr: 42 },
      { collectedAt: "2026-04-30T09:30:00.000Z", expTime: quote().expTime, strikePrice: 2800, apr: 41 },
      { collectedAt: "2026-04-30T09:45:00.000Z", expTime: quote().expTime, strikePrice: 2800, apr: 68.3 }
    ];

    const evaluation = evaluateAlert({
      quote: quote(),
      history,
      rankInExpiry: 2,
      previousRankInExpiry: 5,
      strategy
    });

    expect(evaluation.shouldAlert).toBe(true);
    expect(evaluation.aprDeltaPct).toBeCloseTo(18.2, 1);
    expect(evaluation.zscore).toBeGreaterThan(2.5);
    expect(evaluation.reasons).toContain("apr_delta");
    expect(evaluation.reasons).toContain("zscore");
    expect(evaluation.reasons).toContain("rank_jump");
  });
});
