import type { BinanceClient } from "./binanceClient.js";
import type {
  BinanceExchangeInfo,
  BinancePremiumIndexRow,
  BinanceSymbolInfo,
  FundingRateSnapshot
} from "./types.js";

type FundingRateClient = Pick<BinanceClient, "get">;

function parseFiniteNumber(value: string | number | undefined, field: string): number {
  if (value === undefined || (typeof value === "string" && value.trim() === "")) {
    throw new Error(`${field} must be a finite number`);
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${field} must be a finite number`);
  }
  return parsed;
}

function toPercentage(value: number): number {
  return Number((value * 100).toFixed(12));
}

export function filterBinancePerpetualSymbols(
  symbols: BinanceSymbolInfo[],
  quoteCcy = "USDT"
): BinanceSymbolInfo[] {
  const normalizedQuote = quoteCcy.toUpperCase();
  return symbols.filter(
    (symbol) =>
      symbol.contractType === "PERPETUAL" &&
      symbol.status === "TRADING" &&
      symbol.quoteAsset === normalizedQuote &&
      symbol.marginAsset === normalizedQuote
  );
}

export function normalizeBinanceFundingRate(
  row: BinancePremiumIndexRow,
  symbol: BinanceSymbolInfo
): FundingRateSnapshot {
  const fundingRate = parseFiniteNumber(row.lastFundingRate, "lastFundingRate");
  const nextFundingTime = parseFiniteNumber(row.nextFundingTime, "nextFundingTime");

  return {
    exchange: "BINANCE",
    instId: row.symbol,
    baseCcy: symbol.baseAsset,
    quoteCcy: symbol.quoteAsset,
    fundingRate,
    fundingRatePct: toPercentage(fundingRate),
    nextFundingRate: null,
    nextFundingRatePct: null,
    fundingTime: nextFundingTime,
    nextFundingTime,
    method: "premium_index",
    ts: parseFiniteNumber(row.time, "time"),
    rawPayload: row
  };
}

export async function fetchBinanceFundingRateSnapshots(
  client: FundingRateClient,
  quoteCcy = "USDT"
): Promise<FundingRateSnapshot[]> {
  const exchangeInfo = await client.get<BinanceExchangeInfo>("/fapi/v1/exchangeInfo");
  const eligibleSymbols = filterBinancePerpetualSymbols(exchangeInfo.symbols, quoteCcy);
  const symbolByName = new Map(eligibleSymbols.map((symbol) => [symbol.symbol, symbol]));
  const rows = await client.get<BinancePremiumIndexRow[]>("/fapi/v1/premiumIndex");

  return rows.flatMap((row) => {
    const symbol = symbolByName.get(row.symbol);
    return symbol === undefined ? [] : [normalizeBinanceFundingRate(row, symbol)];
  });
}
