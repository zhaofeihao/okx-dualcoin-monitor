import { calculateRankByApr, evaluateAlert, filterCandidates } from "./analytics.js";
import type { Repository } from "./db.js";
import { fetchDualInvestmentQuotes } from "./dualInvestmentApi.js";
import type { OkxClient } from "./okxClient.js";
import { fetchSpotPrice } from "./spot.js";
import { formatAlertMessage, type TelegramNotifier } from "./telegram.js";
import type { AppConfig, DualInvestmentAlert, DualInvestmentQuote } from "./types.js";

interface MonitorDeps {
  client: OkxClient;
  repository: Repository;
  notifier: TelegramNotifier;
  now?: () => Date;
}

export interface MonitorCycleResult {
  fetchedQuotes: number;
  insertedQuotes: number;
  candidates: number;
  alerts: number;
}

function since24h(date: Date): string {
  return new Date(date.getTime() - 24 * 60 * 60 * 1000).toISOString();
}

function toAlert(evaluation: ReturnType<typeof evaluateAlert>, message: string): DualInvestmentAlert {
  if (evaluation.quote.id === undefined) {
    throw new Error("Cannot create alert before quote has an id");
  }

  return {
    quoteId: evaluation.quote.id,
    alertKey: evaluation.alertKey,
    exchange: evaluation.quote.exchange,
    asset: evaluation.quote.asset,
    quote: evaluation.quote.quote,
    direction: evaluation.quote.direction,
    productId: evaluation.quote.productId,
    expTime: evaluation.quote.expTime,
    strikePrice: evaluation.quote.strikePrice,
    apr: evaluation.quote.apr,
    aprDeltaPct: evaluation.aprDeltaPct,
    mean24hApr: evaluation.mean24hApr,
    stddev24hApr: evaluation.stddev24hApr,
    zscore: evaluation.zscore,
    rankInExpiry: evaluation.rankInExpiry,
    message,
    sentToTelegram: false
  };
}

function groupByExpiry(quotes: DualInvestmentQuote[]): Map<number, DualInvestmentQuote[]> {
  const groups = new Map<number, DualInvestmentQuote[]>();
  for (const quote of quotes) {
    const group = groups.get(quote.expTime) ?? [];
    group.push(quote);
    groups.set(quote.expTime, group);
  }
  return groups;
}

export async function runMonitorCycle(
  config: AppConfig,
  deps: MonitorDeps
): Promise<MonitorCycleResult> {
  const collectedAt = deps.now?.() ?? new Date();
  const spotPrice = await fetchSpotPrice(
    deps.client,
    config.strategy.asset,
    config.strategy.quote
  );
  const quotes = await fetchDualInvestmentQuotes({
    client: deps.client,
    asset: config.strategy.asset,
    quote: config.strategy.quote,
    direction: config.strategy.direction,
    spotPrice,
    collectedAt
  });

  let insertedQuotes = 0;
  const persistedQuotes = quotes.map((quote) => {
    try {
      const id = deps.repository.insertQuote(quote);
      insertedQuotes += 1;
      return { ...quote, id };
    } catch (error) {
      console.error(`Failed to insert quote ${quote.productId}`, error);
      return quote;
    }
  });

  const candidates = filterCandidates(persistedQuotes, config.strategy).filter(
    (quote) => quote.id !== undefined
  );
  const rankMaps = new Map<number, Map<string, number>>();
  for (const [expTime, expiryQuotes] of groupByExpiry(persistedQuotes)) {
    rankMaps.set(expTime, calculateRankByApr(expiryQuotes));
  }

  let alerts = 0;
  for (const candidate of candidates) {
    const history = deps.repository.getQuoteHistory({
      exchange: candidate.exchange,
      asset: candidate.asset,
      quote: candidate.quote,
      direction: candidate.direction,
      expTime: candidate.expTime,
      strikePrice: candidate.strikePrice,
      since: since24h(collectedAt),
      before: candidate.collectedAt
    });
    const rankInExpiry = rankMaps.get(candidate.expTime)?.get(candidate.productId) ?? 9999;
    const previousRankInExpiry = deps.repository.getPreviousRank({
      exchange: candidate.exchange,
      asset: candidate.asset,
      quote: candidate.quote,
      direction: candidate.direction,
      expTime: candidate.expTime,
      productId: candidate.productId,
      before: candidate.collectedAt
    });
    const evaluation = evaluateAlert({
      quote: candidate,
      history,
      rankInExpiry,
      previousRankInExpiry,
      strategy: config.strategy
    });

    if (!evaluation.shouldAlert) {
      continue;
    }

    const message = formatAlertMessage(evaluation);
    const alert = toAlert(evaluation, message);
    const inserted = deps.repository.insertAlert(alert);
    if (!inserted) {
      continue;
    }

    const sentToTelegram = await deps.notifier.send(message);
    if (sentToTelegram) {
      deps.repository.markAlertSent(alert.alertKey);
    }
    alerts += 1;
  }

  return {
    fetchedQuotes: quotes.length,
    insertedQuotes,
    candidates: candidates.length,
    alerts
  };
}
