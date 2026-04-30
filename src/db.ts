import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type {
  Direction,
  DualInvestmentAlert,
  DualInvestmentQuote,
  QuoteHistoryPoint
} from "./types.js";

interface QuoteHistoryQuery {
  exchange: "OKX";
  asset: string;
  quote: string;
  direction: Direction;
  expTime: number;
  strikePrice: number;
  since: string;
  before: string;
}

interface PreviousRankQuery {
  exchange: "OKX";
  asset: string;
  quote: string;
  direction: Direction;
  expTime: number;
  productId: string;
  before: string;
}

interface RankRow {
  product_id: string;
  apr: number;
}

interface HistoryRow {
  id: number;
  collected_at: string;
  exp_time: number;
  strike_price: number;
  apr: number;
}

export interface Repository {
  migrate(): void;
  insertQuote(quote: DualInvestmentQuote): number;
  getQuoteHistory(query: QuoteHistoryQuery): QuoteHistoryPoint[];
  getPreviousRank(query: PreviousRankQuery): number | null;
  insertAlert(alert: DualInvestmentAlert): boolean;
  markAlertSent(alertKey: string): boolean;
  close(): void;
}

export function createRepository(sqlitePath: string): Repository {
  mkdirSync(dirname(sqlitePath), { recursive: true });
  const db = new Database(sqlitePath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  return {
    migrate() {
      db.exec(`
        CREATE TABLE IF NOT EXISTS dual_investment_quotes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          collected_at TEXT NOT NULL,
          exchange TEXT NOT NULL,
          asset TEXT NOT NULL,
          quote TEXT NOT NULL,
          direction TEXT NOT NULL,
          product_id TEXT NOT NULL,
          exp_time INTEGER NOT NULL,
          term_days REAL NOT NULL,
          strike_price REAL NOT NULL,
          spot_price REAL NOT NULL,
          apr REAL NOT NULL,
          estimated_return REAL NOT NULL,
          distance_to_spot_pct REAL NOT NULL,
          min_amount REAL NOT NULL,
          max_amount REAL NOT NULL,
          notional_ccy TEXT NOT NULL,
          raw_payload TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_quotes_bucket_time
          ON dual_investment_quotes (
            exchange,
            asset,
            quote,
            direction,
            exp_time,
            strike_price,
            collected_at
          );

        CREATE INDEX IF NOT EXISTS idx_quotes_expiry_time
          ON dual_investment_quotes (
            exchange,
            asset,
            quote,
            direction,
            exp_time,
            collected_at
          );

        CREATE TABLE IF NOT EXISTS dual_investment_alerts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          quote_id INTEGER NOT NULL,
          alert_key TEXT NOT NULL UNIQUE,
          exchange TEXT NOT NULL,
          asset TEXT NOT NULL,
          quote TEXT NOT NULL,
          direction TEXT NOT NULL,
          product_id TEXT NOT NULL,
          exp_time INTEGER NOT NULL,
          strike_price REAL NOT NULL,
          apr REAL NOT NULL,
          apr_delta_pct REAL,
          mean_24h_apr REAL,
          stddev_24h_apr REAL,
          zscore REAL,
          rank_in_expiry INTEGER NOT NULL,
          message TEXT NOT NULL,
          sent_to_telegram INTEGER NOT NULL,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (quote_id) REFERENCES dual_investment_quotes(id)
        );
      `);
    },

    insertQuote(quote) {
      const result = db
        .prepare(
          `
          INSERT INTO dual_investment_quotes (
            collected_at,
            exchange,
            asset,
            quote,
            direction,
            product_id,
            exp_time,
            term_days,
            strike_price,
            spot_price,
            apr,
            estimated_return,
            distance_to_spot_pct,
            min_amount,
            max_amount,
            notional_ccy,
            raw_payload
          ) VALUES (
            @collectedAt,
            @exchange,
            @asset,
            @quote,
            @direction,
            @productId,
            @expTime,
            @termDays,
            @strikePrice,
            @spotPrice,
            @apr,
            @estimatedReturn,
            @distanceToSpotPct,
            @minAmount,
            @maxAmount,
            @notionalCcy,
            @rawPayload
          )
          `
        )
        .run({
          ...quote,
          rawPayload: JSON.stringify(quote.rawPayload)
        });

      return Number(result.lastInsertRowid);
    },

    getQuoteHistory(query) {
      const rows = db
        .prepare(
          `
          SELECT id, collected_at, exp_time, strike_price, apr
          FROM dual_investment_quotes
          WHERE exchange = @exchange
            AND asset = @asset
            AND quote = @quote
            AND direction = @direction
            AND exp_time = @expTime
            AND strike_price = @strikePrice
            AND collected_at >= @since
            AND collected_at < @before
          ORDER BY collected_at ASC
          `
        )
        .all(query) as HistoryRow[];

      return rows.map((row) => ({
        id: row.id,
        collectedAt: row.collected_at,
        expTime: row.exp_time,
        strikePrice: row.strike_price,
        apr: row.apr
      }));
    },

    getPreviousRank(query) {
      const latest = db
        .prepare(
          `
          SELECT collected_at
          FROM dual_investment_quotes
          WHERE exchange = @exchange
            AND asset = @asset
            AND quote = @quote
            AND direction = @direction
            AND exp_time = @expTime
            AND collected_at < @before
          ORDER BY collected_at DESC
          LIMIT 1
          `
        )
        .get(query) as { collected_at: string } | undefined;

      if (latest === undefined) {
        return null;
      }

      const rows = db
        .prepare(
          `
          SELECT product_id, apr
          FROM dual_investment_quotes
          WHERE exchange = @exchange
            AND asset = @asset
            AND quote = @quote
            AND direction = @direction
            AND exp_time = @expTime
            AND collected_at = @collectedAt
          ORDER BY apr DESC
          `
        )
        .all({ ...query, collectedAt: latest.collected_at }) as RankRow[];

      const index = rows.findIndex((row) => row.product_id === query.productId);
      return index === -1 ? null : index + 1;
    },

    insertAlert(alert) {
      const result = db
        .prepare(
          `
          INSERT OR IGNORE INTO dual_investment_alerts (
            quote_id,
            alert_key,
            exchange,
            asset,
            quote,
            direction,
            product_id,
            exp_time,
            strike_price,
            apr,
            apr_delta_pct,
            mean_24h_apr,
            stddev_24h_apr,
            zscore,
            rank_in_expiry,
            message,
            sent_to_telegram
          ) VALUES (
            @quoteId,
            @alertKey,
            @exchange,
            @asset,
            @quote,
            @direction,
            @productId,
            @expTime,
            @strikePrice,
            @apr,
            @aprDeltaPct,
            @mean24hApr,
            @stddev24hApr,
            @zscore,
            @rankInExpiry,
            @message,
            @sentToTelegram
          )
          `
        )
        .run({
          ...alert,
          sentToTelegram: alert.sentToTelegram ? 1 : 0
        });

      return result.changes === 1;
    },

    markAlertSent(alertKey) {
      const result = db
        .prepare(
          `
          UPDATE dual_investment_alerts
          SET sent_to_telegram = 1
          WHERE alert_key = @alertKey
          `
        )
        .run({ alertKey });

      return result.changes === 1;
    },

    close() {
      db.close();
    }
  };
}
