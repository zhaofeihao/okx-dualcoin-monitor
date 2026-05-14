import { describe, expect, it, vi } from "vitest";
import {
  formatAlertMessage,
  formatFundingRateAlertMessage,
  TelegramNotifier
} from "../src/telegram.js";
import type { AlertEvaluation, FundingRateSnapshot } from "../src/types.js";

const evaluation: AlertEvaluation = {
  quote: {
    id: 7,
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
    rawPayload: {} as never
  },
  aprDeltaPct: 18.2,
  mean24hApr: 52.1,
  stddev24hApr: 11.1,
  zscore: 3.1,
  rankInExpiry: 2,
  previousRankInExpiry: 5,
  shouldAlert: true,
  reasons: ["zscore", "apr_delta"],
  alertKey: "key"
};

function fundingSnapshot(
  overrides: Partial<FundingRateSnapshot> = {}
): FundingRateSnapshot {
  return {
    exchange: "OKX",
    instId: "BTC-USDT-SWAP",
    baseCcy: "BTC",
    quoteCcy: "USDT",
    fundingRate: 0.00375,
    fundingRatePct: 0.375,
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

describe("telegram", () => {
  it("formats alert messages with opportunity details", () => {
    expect(formatAlertMessage(evaluation)).toContain("OKX 双币赢机会");
    expect(formatAlertMessage(evaluation)).toContain("ETH/USDT Buy Low");
    expect(formatAlertMessage(evaluation)).toContain("到期：2026-05-07");
    expect(formatAlertMessage(evaluation)).toContain("目标价：2800 USDT");
    expect(formatAlertMessage(evaluation)).toContain("APR：86.50%");
    expect(formatAlertMessage(evaluation)).toContain("Z-score：3.10");
  });

  it("formats funding-rate alert summaries with direction and next funding time", () => {
    const message = formatFundingRateAlertMessage({
      snapshots: [
        fundingSnapshot(),
        fundingSnapshot({
          instId: "ETH-USDT-SWAP",
          baseCcy: "ETH",
          fundingRate: -0.0082,
          fundingRatePct: -0.82
        })
      ],
      thresholdPct: 0.3,
      scannedAt: new Date("2026-05-14T14:30:00.000Z")
    });

    expect(message).toContain("OKX USDT 永续资金费率预警");
    expect(message).toContain("阈值：|资金费率| > 0.30%");
    expect(message).toContain("扫描时间：2026-05-14 14:30 UTC");
    expect(message).toContain("1. BTC-USDT-SWAP  +0.3750%  多付空收");
    expect(message).toContain("2. ETH-USDT-SWAP  -0.8200%  空付多收");
    expect(message).toContain("下次资金：2026-05-15 00:00 UTC");
  });

  it("does not send when credentials are missing", async () => {
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const fetchMock = vi.fn();
    const notifier = new TelegramNotifier(undefined, undefined, fetchMock);

    await expect(notifier.send("hello")).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(consoleLog).toHaveBeenCalledWith("hello");
    consoleLog.mockRestore();
  });

  it("sends Telegram messages when credentials exist", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ ok: true })
    });
    const notifier = new TelegramNotifier("token", "chat", fetchMock);

    await expect(notifier.send("hello")).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.telegram.org/bottoken/sendMessage",
      expect.objectContaining({ method: "POST" })
    );
  });
});
