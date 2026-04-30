import type {
  AlertEvaluation,
  DualInvestmentQuote,
  QuoteHistoryPoint,
  StrategyConfig
} from "./types.js";

interface EvaluateAlertInput {
  quote: DualInvestmentQuote;
  history: QuoteHistoryPoint[];
  rankInExpiry: number;
  previousRankInExpiry: number | null;
  strategy: StrategyConfig;
}

export function filterCandidates(
  quotes: DualInvestmentQuote[],
  strategy: StrategyConfig
): DualInvestmentQuote[] {
  return quotes.filter((quote) => {
    const strikeAllowed =
      strategy.acceptableStrikes.length === 0 ||
      strategy.acceptableStrikes.includes(quote.strikePrice);

    return (
      quote.asset === strategy.asset &&
      quote.quote === strategy.quote &&
      quote.direction === strategy.direction &&
      strikeAllowed &&
      quote.distanceToSpotPct >= 0 &&
      quote.distanceToSpotPct <= strategy.maxDistanceFromSpotPct &&
      quote.apr >= strategy.minApr &&
      quote.termDays >= strategy.minTermDays &&
      quote.termDays <= strategy.maxTermDays
    );
  });
}

export function calculateMean(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function calculateStddev(values: number[]): number | null {
  const mean = calculateMean(values);
  if (mean === null || values.length === 0) {
    return null;
  }

  const variance =
    values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

export function calculateZScore(current: number, historyValues: number[]): number | null {
  const mean = calculateMean(historyValues);
  const stddev = calculateStddev(historyValues);
  if (mean === null || stddev === null || stddev === 0) {
    return null;
  }
  return (current - mean) / stddev;
}

export function calculateAprDeltaPct(currentApr: number, previousApr: number): number | null {
  if (!Number.isFinite(previousApr)) {
    return null;
  }
  return currentApr - previousApr;
}

export function calculateRankByApr(quotes: DualInvestmentQuote[]): Map<string, number> {
  const sorted = [...quotes].sort((a, b) => b.apr - a.apr);
  return new Map(sorted.map((quote, index) => [quote.productId, index + 1]));
}

export function buildAlertKey(quote: DualInvestmentQuote, collectedAt: string): string {
  const hour = collectedAt.slice(0, 13);
  return [
    quote.exchange,
    quote.asset,
    quote.quote,
    quote.direction,
    quote.expTime,
    quote.strikePrice,
    hour
  ].join(":");
}

export function evaluateAlert(input: EvaluateAlertInput): AlertEvaluation {
  const historyAprs = input.history.map((point) => point.apr);
  const latestPrior = [...input.history].sort((a, b) =>
    a.collectedAt.localeCompare(b.collectedAt)
  )[input.history.length - 1];
  const aprDeltaPct =
    latestPrior === undefined ? null : calculateAprDeltaPct(input.quote.apr, latestPrior.apr);
  const mean24hApr = calculateMean(historyAprs);
  const stddev24hApr = calculateStddev(historyAprs);
  const zscore = calculateZScore(input.quote.apr, historyAprs);
  const reasons: string[] = [];

  if (zscore !== null && zscore >= input.strategy.alertZScore) {
    reasons.push("zscore");
  }

  if (aprDeltaPct !== null && aprDeltaPct >= input.strategy.alertAprDeltaPct) {
    reasons.push("apr_delta");
  }

  if (
    mean24hApr !== null &&
    mean24hApr > 0 &&
    input.quote.apr / mean24hApr >= input.strategy.alertMeanMultiplier
  ) {
    reasons.push("mean_multiplier");
  }

  if (
    input.rankInExpiry <= input.strategy.rankingTopN &&
    input.previousRankInExpiry !== null &&
    input.previousRankInExpiry > input.strategy.rankingTopN
  ) {
    reasons.push("rank_jump");
  }

  return {
    quote: input.quote,
    aprDeltaPct,
    mean24hApr,
    stddev24hApr,
    zscore,
    rankInExpiry: input.rankInExpiry,
    previousRankInExpiry: input.previousRankInExpiry,
    shouldAlert: reasons.length > 0,
    reasons,
    alertKey: buildAlertKey(input.quote, input.quote.collectedAt)
  };
}
