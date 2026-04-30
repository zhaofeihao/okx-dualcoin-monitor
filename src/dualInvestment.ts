import type {
  Direction,
  DualInvestmentQuote,
  OkxDualInvestmentProduct
} from "./types.js";

interface NormalizeOptions {
  collectedAt: Date;
  spotPrice: number;
  direction: Direction;
}

function requiredNumber(value: string, fieldName: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${fieldName} must be a finite number`);
  }
  return parsed;
}

export function normalizeOkxApr(value: string): number {
  const parsed = requiredNumber(value, "annualizedYield");
  return parsed > 1 ? parsed : parsed * 100;
}

export function calculateDistanceToSpotPct(spotPrice: number, strikePrice: number): number {
  if (!Number.isFinite(spotPrice) || spotPrice <= 0) {
    throw new Error("spotPrice must be a positive finite number");
  }
  return ((spotPrice - strikePrice) / spotPrice) * 100;
}

export function calculateTermDays(collectedAt: Date, expTime: number): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return (expTime - collectedAt.getTime()) / msPerDay;
}

export function normalizeDualInvestmentProduct(
  product: OkxDualInvestmentProduct,
  options: NormalizeOptions
): DualInvestmentQuote {
  const strikePrice = requiredNumber(product.strike, "strike");
  const expTime = requiredNumber(product.expTime, "expTime");
  const spotPrice = options.spotPrice;

  return {
    collectedAt: options.collectedAt.toISOString(),
    exchange: "OKX",
    asset: product.baseCcy,
    quote: product.quoteCcy,
    direction: options.direction,
    productId: product.productId,
    expTime,
    termDays: calculateTermDays(options.collectedAt, expTime),
    strikePrice,
    spotPrice,
    apr: normalizeOkxApr(product.annualizedYield),
    estimatedReturn: requiredNumber(product.absYield, "absYield"),
    distanceToSpotPct: calculateDistanceToSpotPct(spotPrice, strikePrice),
    minAmount: requiredNumber(product.minSize, "minSize"),
    maxAmount: requiredNumber(product.maxSize, "maxSize"),
    notionalCcy: product.notionalCcy,
    rawPayload: product
  };
}
