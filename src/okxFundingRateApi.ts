import type { OkxClient } from "./okxClient.js";
import type { FundingRateSnapshot, OkxFundingRateRow, OkxSwapInstrument } from "./types.js";

type FundingRateClient = Pick<OkxClient, "get">;

function parseFiniteNumber(value: string | undefined, field: string): number {
  if (value === undefined || value.trim() === "") {
    throw new Error(`${field} must be a finite number`);
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${field} must be a finite number`);
  }
  return parsed;
}

function parseNullableNumber(value: string | undefined): number | null {
  if (value === undefined || value.trim() === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseInstrumentCurrencies(instId: string): { baseCcy: string; quoteCcy: string } {
  const [baseCcy, quoteCcy] = instId.split("-");
  if (!baseCcy || !quoteCcy) {
    throw new Error(`Unexpected OKX swap instrument id: ${instId}`);
  }
  return { baseCcy, quoteCcy };
}

export function filterUsdtLinearSwapInstruments(
  instruments: OkxSwapInstrument[],
  quoteCcy = "USDT"
): OkxSwapInstrument[] {
  const normalizedQuote = quoteCcy.toUpperCase();
  return instruments.filter(
    (instrument) =>
      instrument.instType === "SWAP" &&
      instrument.ctType === "linear" &&
      instrument.settleCcy === normalizedQuote &&
      instrument.state === "live" &&
      instrument.instId.endsWith(`-${normalizedQuote}-SWAP`)
  );
}

export function normalizeOkxFundingRate(row: OkxFundingRateRow): FundingRateSnapshot {
  const fundingRate = parseFiniteNumber(row.fundingRate, "fundingRate");
  const nextFundingRate = parseNullableNumber(row.nextFundingRate);
  const { baseCcy, quoteCcy } = parseInstrumentCurrencies(row.instId);

  return {
    exchange: "OKX",
    instId: row.instId,
    baseCcy,
    quoteCcy,
    fundingRate,
    fundingRatePct: fundingRate * 100,
    nextFundingRate,
    nextFundingRatePct: nextFundingRate === null ? null : nextFundingRate * 100,
    fundingTime: parseFiniteNumber(row.fundingTime, "fundingTime"),
    nextFundingTime: parseNullableNumber(row.nextFundingTime),
    method: row.method === undefined || row.method.trim() === "" ? null : row.method,
    ts: parseFiniteNumber(row.ts, "ts"),
    rawPayload: row
  };
}

export async function fetchOkxFundingRateSnapshots(
  client: FundingRateClient,
  quoteCcy = "USDT"
): Promise<FundingRateSnapshot[]> {
  const instruments = await client.get<OkxSwapInstrument[]>("/api/v5/public/instruments", {
    instType: "SWAP"
  });
  const eligibleInstruments = filterUsdtLinearSwapInstruments(instruments, quoteCcy);

  const snapshots: FundingRateSnapshot[] = [];
  for (const instrument of eligibleInstruments) {
    try {
      const rows = await client.get<OkxFundingRateRow[]>("/api/v5/public/funding-rate", {
        instId: instrument.instId
      });
      const row = rows[0];
      if (row === undefined) {
        continue;
      }
      snapshots.push(normalizeOkxFundingRate(row));
    } catch (error) {
      console.error(`Failed to fetch funding rate for ${instrument.instId}`, error);
    }
  }

  return snapshots;
}
