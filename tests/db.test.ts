import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createRepository } from "../src/db.js";
import type { DualInvestmentAlert, DualInvestmentQuote } from "../src/types.js";

let tmpDirs: string[] = [];

function tempDbPath(): string {
  const dir = mkdtempSync(join(tmpdir(), "okx-dual-test-"));
  tmpDirs.push(dir);
  return join(dir, "test.sqlite");
}

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
    rawPayload: { productId: "ETH-USDT-260507-2800-P" } as DualInvestmentQuote["rawPayload"],
    ...overrides
  };
}

afterEach(() => {
  for (const dir of tmpDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
  tmpDirs = [];
});

describe("SQLite repository", () => {
  it("inserts quotes and loads 24h history for the same expiry and strike", () => {
    const repo = createRepository(tempDbPath());
    repo.migrate();
    const firstId = repo.insertQuote(quote({ collectedAt: "2026-04-30T09:45:00.000Z", apr: 68.3 }));
    const secondId = repo.insertQuote(quote({ collectedAt: "2026-04-30T10:00:00.000Z", apr: 86.5 }));
    repo.insertQuote(quote({ strikePrice: 2600, apr: 99 }));

    const history = repo.getQuoteHistory({
      exchange: "OKX",
      asset: "ETH",
      quote: "USDT",
      direction: "buy_low",
      expTime: quote().expTime,
      strikePrice: 2800,
      since: "2026-04-29T10:00:00.000Z",
      before: "2026-04-30T10:00:00.000Z"
    });

    expect(firstId).toBeGreaterThan(0);
    expect(secondId).toBeGreaterThan(firstId);
    expect(history).toEqual([
      {
        id: firstId,
        collectedAt: "2026-04-30T09:45:00.000Z",
        expTime: quote().expTime,
        strikePrice: 2800,
        apr: 68.3
      }
    ]);
    repo.close();
  });

  it("returns previous rank by expiry before the current collection time", () => {
    const repo = createRepository(tempDbPath());
    repo.migrate();
    repo.insertQuote(quote({ productId: "a", collectedAt: "2026-04-30T09:45:00.000Z", apr: 90 }));
    repo.insertQuote(quote({ productId: "b", collectedAt: "2026-04-30T09:45:00.000Z", apr: 70 }));
    repo.insertQuote(quote({ productId: "c", collectedAt: "2026-04-30T09:45:00.000Z", apr: 60 }));
    repo.insertQuote(quote({ productId: "d", collectedAt: "2026-04-30T09:45:00.000Z", apr: 50 }));

    expect(
      repo.getPreviousRank({
        exchange: "OKX",
        asset: "ETH",
        quote: "USDT",
        direction: "buy_low",
        expTime: quote().expTime,
        productId: "c",
        before: "2026-04-30T10:00:00.000Z"
      })
    ).toBe(3);
    repo.close();
  });

  it("deduplicates alerts by alert key", () => {
    const repo = createRepository(tempDbPath());
    repo.migrate();
    const quoteId = repo.insertQuote(quote());
    const alert: DualInvestmentAlert = {
      quoteId,
      alertKey: "dedupe-key",
      exchange: "OKX",
      asset: "ETH",
      quote: "USDT",
      direction: "buy_low",
      productId: "ETH-USDT-260507-2800-P",
      expTime: quote().expTime,
      strikePrice: 2800,
      apr: 86.5,
      aprDeltaPct: 18.2,
      mean24hApr: 52.1,
      stddev24hApr: 10,
      zscore: 3.1,
      rankInExpiry: 2,
      message: "alert",
      sentToTelegram: false
    };

    expect(repo.insertAlert(alert)).toBe(true);
    expect(repo.insertAlert(alert)).toBe(false);
    expect(repo.markAlertSent("dedupe-key")).toBe(true);
    expect(repo.markAlertSent("missing-key")).toBe(false);
    repo.close();
  });
});
