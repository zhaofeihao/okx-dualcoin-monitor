import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";

describe("loadConfig", () => {
  it("uses ETH buy_low defaults for the MVP strategy", () => {
    const config = loadConfig({});

    expect(config.okxBaseUrl).toBe("https://www.okx.com");
    expect(config.sqlitePath).toBe("./data/okx-dualcoin-monitor.sqlite");
    expect(config.pollIntervalMinutes).toBe(15);
    expect(config.strategy).toEqual({
      asset: "ETH",
      quote: "USDT",
      direction: "buy_low",
      acceptableStrikes: [],
      maxDistanceFromSpotPct: 12,
      minApr: 35,
      minTermDays: 1,
      maxTermDays: 14,
      alertZScore: 2.5,
      alertAprDeltaPct: 10,
      alertMeanMultiplier: 1.5,
      rankingTopN: 3
    });
  });

  it("parses numeric strategy overrides and acceptable strikes", () => {
    const config = loadConfig({
      SQLITE_PATH: "/tmp/monitor.sqlite",
      POLL_INTERVAL_MINUTES: "5",
      STRATEGY_ACCEPTABLE_STRIKES: "2600,2700.5, 2800",
      STRATEGY_MIN_APR: "42",
      STRATEGY_MAX_DISTANCE_FROM_SPOT_PCT: "8.5",
      STRATEGY_RANKING_TOP_N: "5"
    });

    expect(config.sqlitePath).toBe("/tmp/monitor.sqlite");
    expect(config.pollIntervalMinutes).toBe(5);
    expect(config.strategy.acceptableStrikes).toEqual([2600, 2700.5, 2800]);
    expect(config.strategy.minApr).toBe(42);
    expect(config.strategy.maxDistanceFromSpotPct).toBe(8.5);
    expect(config.strategy.rankingTopN).toBe(5);
  });

  it("rejects invalid numeric configuration", () => {
    expect(() => loadConfig({ STRATEGY_MIN_APR: "high" })).toThrow(
      "STRATEGY_MIN_APR must be a finite number"
    );
  });
});
