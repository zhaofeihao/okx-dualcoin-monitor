import { describe, expect, it, vi } from "vitest";
import { runFundingRateMonitorCycle } from "../src/fundingRateMonitor.js";
import type { AppConfig, FundingRateSnapshot } from "../src/types.js";

function config(overrides: Partial<AppConfig["fundingRate"]> = {}): AppConfig {
  return {
    okxBaseUrl: "https://www.okx.com",
    binanceBaseUrl: "https://fapi.binance.com",
    okxApiKey: undefined,
    okxSecretKey: undefined,
    okxPassphrase: undefined,
    sqlitePath: ":memory:",
    pollIntervalMinutes: 15,
    telegramBotToken: undefined,
    telegramChatId: undefined,
    logLevel: "info",
    fundingRate: {
      enabled: true,
      intervalMinutes: 30,
      thresholdPct: 0.3,
      quoteCcy: "USDT",
      topN: 20,
      timeZone: "Asia/Shanghai",
      timeZoneLabel: "UTC+8",
      ...overrides
    },
    strategy: {
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
    }
  };
}

function snapshot(overrides: Partial<FundingRateSnapshot> = {}): FundingRateSnapshot {
  return {
    exchange: "OKX",
    instId: "BTC-USDT-SWAP",
    baseCcy: "BTC",
    quoteCcy: "USDT",
    fundingRate: 0.004,
    fundingRatePct: 0.4,
    nextFundingRate: null,
    nextFundingRatePct: null,
    fundingTime: Date.parse("2026-05-14T16:00:00.000Z"),
    nextFundingTime: Date.parse("2026-05-15T00:00:00.000Z"),
    method: "current_period",
    ts: Date.parse("2026-05-14T14:30:00.000Z"),
    rawPayload: {} as FundingRateSnapshot["rawPayload"],
    ...overrides
  };
}

describe("fundingRateMonitor", () => {
  it("sends one summary when snapshots exceed the threshold", async () => {
    const send = vi.fn().mockResolvedValue(true);

    const result = await runFundingRateMonitorCycle(config(), {
      client: {} as never,
      notifier: { send },
      fetchSnapshots: async () => [
        snapshot({ instId: "BTC-USDT-SWAP", fundingRatePct: 0.4 }),
        snapshot({ instId: "ETH-USDT-SWAP", fundingRatePct: -0.8 }),
        snapshot({ instId: "SOL-USDT-SWAP", fundingRatePct: 0.2 })
      ],
      now: () => new Date("2026-05-14T14:30:00.000Z")
    });

    expect(result).toEqual({
      fetchedSnapshots: 3,
      alerts: 2,
      sent: true
    });
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0]?.[0]).toContain("OKX ETH-USDT-SWAP  <b>-0.8000%</b>");
    expect(send.mock.calls[0]?.[0]).not.toContain("空付多收");
  });

  it("does not send when no snapshot exceeds the threshold", async () => {
    const send = vi.fn().mockResolvedValue(true);

    const result = await runFundingRateMonitorCycle(config(), {
      client: {} as never,
      notifier: { send },
      fetchSnapshots: async () => [snapshot({ fundingRatePct: 0.1 })]
    });

    expect(result).toEqual({
      fetchedSnapshots: 1,
      alerts: 0,
      sent: false
    });
    expect(send).not.toHaveBeenCalled();
  });

  it("combines OKX and Binance snapshots into one funding-rate summary", async () => {
    const send = vi.fn().mockResolvedValue(true);

    const result = await runFundingRateMonitorCycle(config(), {
      client: {} as never,
      binanceClient: {} as never,
      notifier: { send },
      fetchOkxSnapshots: async () => [snapshot({ instId: "BTC-USDT-SWAP", fundingRatePct: 0.4 })],
      fetchBinanceSnapshots: async () => [
        snapshot({
          exchange: "BINANCE",
          instId: "ETHUSDT",
          baseCcy: "ETH",
          fundingRate: -0.006,
          fundingRatePct: -0.6,
          rawPayload: {} as FundingRateSnapshot["rawPayload"]
        })
      ],
      now: () => new Date("2026-05-14T14:30:00.000Z")
    });

    expect(result).toEqual({
      fetchedSnapshots: 2,
      alerts: 2,
      sent: true
    });
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0]?.[0]).toContain("1. BINANCE ETHUSDT  <b>-0.6000%</b>");
    expect(send.mock.calls[0]?.[0]).toContain("2. OKX BTC-USDT-SWAP  <b>+0.4000%</b>");
    expect(send.mock.calls[0]?.[0]).not.toContain("空付多收");
    expect(send.mock.calls[0]?.[0]).not.toContain("多付空收");
  });
});
