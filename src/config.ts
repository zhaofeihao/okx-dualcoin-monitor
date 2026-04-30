import "dotenv/config";
import type { AppConfig, Direction, StrategyConfig } from "./types.js";

type Env = Record<string, string | undefined>;

const DEFAULT_STRATEGY: StrategyConfig = {
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
};

function parseNumber(env: Env, key: string, fallback: number): number {
  const value = env[key];
  if (value === undefined || value.trim() === "") {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${key} must be a finite number`);
  }
  return parsed;
}

function parseString(env: Env, key: string, fallback: string): string {
  const value = env[key];
  return value === undefined || value.trim() === "" ? fallback : value.trim();
}

function parseDirection(env: Env): Direction {
  const value = parseString(env, "STRATEGY_DIRECTION", DEFAULT_STRATEGY.direction);
  if (value !== "buy_low") {
    throw new Error("STRATEGY_DIRECTION must be buy_low");
  }
  return value;
}

function parseAcceptableStrikes(env: Env): number[] {
  const value = env.STRATEGY_ACCEPTABLE_STRIKES;
  if (value === undefined || value.trim() === "") {
    return [];
  }

  return value.split(",").map((part) => {
    const parsed = Number(part.trim());
    if (!Number.isFinite(parsed)) {
      throw new Error("STRATEGY_ACCEPTABLE_STRIKES must be comma-separated numbers");
    }
    return parsed;
  });
}

export function loadConfig(env: Env = process.env): AppConfig {
  const strategy: StrategyConfig = {
    asset: parseString(env, "STRATEGY_ASSET", DEFAULT_STRATEGY.asset).toUpperCase(),
    quote: parseString(env, "STRATEGY_QUOTE", DEFAULT_STRATEGY.quote).toUpperCase(),
    direction: parseDirection(env),
    acceptableStrikes: parseAcceptableStrikes(env),
    maxDistanceFromSpotPct: parseNumber(
      env,
      "STRATEGY_MAX_DISTANCE_FROM_SPOT_PCT",
      DEFAULT_STRATEGY.maxDistanceFromSpotPct
    ),
    minApr: parseNumber(env, "STRATEGY_MIN_APR", DEFAULT_STRATEGY.minApr),
    minTermDays: parseNumber(env, "STRATEGY_MIN_TERM_DAYS", DEFAULT_STRATEGY.minTermDays),
    maxTermDays: parseNumber(env, "STRATEGY_MAX_TERM_DAYS", DEFAULT_STRATEGY.maxTermDays),
    alertZScore: parseNumber(env, "STRATEGY_ALERT_ZSCORE", DEFAULT_STRATEGY.alertZScore),
    alertAprDeltaPct: parseNumber(
      env,
      "STRATEGY_ALERT_APR_DELTA_PCT",
      DEFAULT_STRATEGY.alertAprDeltaPct
    ),
    alertMeanMultiplier: parseNumber(
      env,
      "STRATEGY_ALERT_MEAN_MULTIPLIER",
      DEFAULT_STRATEGY.alertMeanMultiplier
    ),
    rankingTopN: parseNumber(env, "STRATEGY_RANKING_TOP_N", DEFAULT_STRATEGY.rankingTopN)
  };

  return {
    okxBaseUrl: parseString(env, "OKX_BASE_URL", "https://www.okx.com"),
    okxApiKey: env.OKX_API_KEY?.trim() || undefined,
    okxSecretKey: env.OKX_SECRET_KEY?.trim() || undefined,
    okxPassphrase: env.OKX_PASSPHRASE?.trim() || undefined,
    sqlitePath: parseString(env, "SQLITE_PATH", "./data/okx-dualcoin-monitor.sqlite"),
    pollIntervalMinutes: parseNumber(env, "POLL_INTERVAL_MINUTES", 15),
    telegramBotToken: env.TELEGRAM_BOT_TOKEN?.trim() || undefined,
    telegramChatId: env.TELEGRAM_CHAT_ID?.trim() || undefined,
    logLevel: parseString(env, "LOG_LEVEL", "info"),
    strategy
  };
}
