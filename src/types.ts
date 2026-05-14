export type Direction = "buy_low";

export interface StrategyConfig {
  asset: string;
  quote: string;
  direction: Direction;
  acceptableStrikes: number[];
  maxDistanceFromSpotPct: number;
  minApr: number;
  minTermDays: number;
  maxTermDays: number;
  alertZScore: number;
  alertAprDeltaPct: number;
  alertMeanMultiplier: number;
  rankingTopN: number;
}

export interface FundingRateConfig {
  enabled: boolean;
  intervalMinutes: number;
  thresholdPct: number;
  quoteCcy: string;
  topN: number;
  timeZone: string;
  timeZoneLabel: string;
}

export interface AppConfig {
  okxBaseUrl: string;
  okxApiKey: string | undefined;
  okxSecretKey: string | undefined;
  okxPassphrase: string | undefined;
  sqlitePath: string;
  pollIntervalMinutes: number;
  telegramBotToken: string | undefined;
  telegramChatId: string | undefined;
  logLevel: string;
  fundingRate: FundingRateConfig;
  strategy: StrategyConfig;
}

export interface OkxSwapInstrument {
  instType: string;
  instId: string;
  instFamily?: string;
  ctType?: string;
  settleCcy?: string;
  state?: string;
}

export interface OkxFundingRateRow {
  formulaType?: string;
  fundingRate: string;
  fundingTime: string;
  instId: string;
  instType: string;
  interestRate?: string;
  maxFundingRate?: string;
  method?: string;
  minFundingRate?: string;
  nextFundingRate?: string;
  nextFundingTime?: string;
  premium?: string;
  prevFundingTime?: string;
  realizedRate?: string;
  settFundingRate?: string;
  settState?: string;
  ts: string;
}

export interface FundingRateSnapshot {
  exchange: "OKX";
  instId: string;
  baseCcy: string;
  quoteCcy: string;
  fundingRate: number;
  fundingRatePct: number;
  nextFundingRate: number | null;
  nextFundingRatePct: number | null;
  fundingTime: number;
  nextFundingTime: number | null;
  method: string | null;
  ts: number;
  rawPayload: OkxFundingRateRow;
}

export interface OkxDualInvestmentProduct {
  absYield: string;
  annualizedYield: string;
  baseCcy: string;
  quoteCcy: string;
  expTime: string;
  interestAccrualTime?: string;
  listTime?: string;
  maxSize: string;
  minSize: string;
  notionalCcy: string;
  optType: string;
  productId: string;
  quoteTime?: string;
  redeemEndTime?: string;
  redeemStartTime?: string;
  stepSz?: string;
  tradeEndTime?: string;
  strike: string;
  uly?: string;
}

export interface DualInvestmentQuote {
  id?: number;
  collectedAt: string;
  exchange: "OKX";
  asset: string;
  quote: string;
  direction: Direction;
  productId: string;
  expTime: number;
  termDays: number;
  strikePrice: number;
  spotPrice: number;
  apr: number;
  estimatedReturn: number;
  distanceToSpotPct: number;
  minAmount: number;
  maxAmount: number;
  notionalCcy: string;
  rawPayload: OkxDualInvestmentProduct;
}

export interface QuoteHistoryPoint {
  id?: number;
  collectedAt: string;
  expTime: number;
  strikePrice: number;
  apr: number;
}

export interface AlertEvaluation {
  quote: DualInvestmentQuote;
  aprDeltaPct: number | null;
  mean24hApr: number | null;
  stddev24hApr: number | null;
  zscore: number | null;
  rankInExpiry: number;
  previousRankInExpiry: number | null;
  shouldAlert: boolean;
  reasons: string[];
  alertKey: string;
}

export interface DualInvestmentAlert {
  quoteId: number;
  alertKey: string;
  exchange: "OKX";
  asset: string;
  quote: string;
  direction: Direction;
  productId: string;
  expTime: number;
  strikePrice: number;
  apr: number;
  aprDeltaPct: number | null;
  mean24hApr: number | null;
  stddev24hApr: number | null;
  zscore: number | null;
  rankInExpiry: number;
  message: string;
  sentToTelegram: boolean;
}
