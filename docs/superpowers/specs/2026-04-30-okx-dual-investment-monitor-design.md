# OKX Dual Investment Monitor Design

## Goal

Build a TypeScript background monitor for OKX Dual Investment ETH/USDT Buy Low products. The MVP records 15-minute product snapshots in SQLite, detects abnormal APR changes for acceptable strike/expiry buckets, and sends Telegram alerts. It does not place trades, request trade quotes, redeem positions, or perform any automatic fund movement.

## Scope

In scope:

- Fetch OKX Dual Investment product list for ETH/USDT Buy Low.
- Fetch ETH/USDT spot price from OKX public market data.
- Normalize product snapshots into a local SQLite table.
- Calculate term days, strike distance from spot, APR, estimated return, 15-minute APR delta, 24-hour mean, 24-hour standard deviation, z-score, and same-expiry ranking.
- Apply a configurable target acquisition strategy.
- Store triggered alerts and suppress duplicate Telegram notifications.
- Run as a PM2-managed TypeScript service on a server.

Out of scope for MVP:

- Automatic subscription, order placement, quote locking, or redemption.
- Automatic trading endpoints. The product-list endpoint is signed with read-only OKX API credentials because OKX currently rejects it without `OK-ACCESS-KEY`.
- Portfolio/account balance monitoring.
- Options-market comparison against Deribit or OKX options.
- Web dashboard or chart UI.

## Technology

- Runtime: Node.js with TypeScript.
- Package manager: npm, unless the project later adopts another manager.
- HTTP: `undici` or native `fetch` through Node 20+.
- Database: SQLite via a synchronous driver such as `better-sqlite3`.
- Scheduling: in-process timer with a 15-minute default interval.
- Process management: PM2 via `ecosystem.config.cjs`.
- Tests: Vitest for unit tests.
- Configuration: `.env` plus a checked-in example file.

## Configuration

The monitor uses environment variables for deployment concerns and a small strategy object for trading-preference thresholds.

Environment variables:

- `OKX_BASE_URL`: defaults to `https://www.okx.com`.
- `OKX_API_KEY`: read-only OKX API key for Dual Investment product data.
- `OKX_SECRET_KEY`: OKX API secret for request signing.
- `OKX_PASSPHRASE`: OKX API passphrase for request signing.
- `SQLITE_PATH`: defaults to `./data/okx-dualcoin-monitor.sqlite`.
- `POLL_INTERVAL_MINUTES`: defaults to `15`.
- `TELEGRAM_BOT_TOKEN`: optional; if missing, alerts are logged but not sent.
- `TELEGRAM_CHAT_ID`: optional; required together with bot token to send Telegram alerts.
- `LOG_LEVEL`: defaults to `info`.

Default strategy:

```json
{
  "asset": "ETH",
  "quote": "USDT",
  "direction": "buy_low",
  "acceptableStrikes": [],
  "maxDistanceFromSpotPct": 12,
  "minApr": 35,
  "minTermDays": 1,
  "maxTermDays": 14,
  "alertZScore": 2.5,
  "alertAprDeltaPct": 10,
  "alertMeanMultiplier": 1.5,
  "rankingTopN": 3
}
```

`acceptableStrikes: []` means any strike is allowed if it passes distance and term filters. If it contains values, only those target prices are eligible.

## OKX Mapping

For Buy Low ETH/USDT, the monitor calls:

```text
GET /api/v5/finance/sfp/dcd/products?baseCcy=ETH&quoteCcy=USDT&optType=P
```

The OKX docs define `P` as put-like dual investment. For the user's target-acquisition use case, `P` is treated as `buy_low`: invest quote currency, accept buying ETH at the strike if the target is triggered.

Spot price comes from OKX public market data:

```text
GET /api/v5/market/ticker?instId=ETH-USDT
```

This endpoint is outside the captured Dual Investment chapter and is a public OKX API endpoint. The Dual Investment product endpoint itself is signed with read-only credentials.

## Data Model

`dual_investment_quotes` stores every collected product snapshot.

Columns:

- `id`: integer primary key.
- `collected_at`: ISO timestamp for local collection time.
- `exchange`: fixed `OKX`.
- `asset`: e.g. `ETH`.
- `quote`: e.g. `USDT`.
- `direction`: fixed `buy_low` for MVP.
- `product_id`: OKX product ID.
- `exp_time`: OKX expiry timestamp in milliseconds.
- `term_days`: days between collection time and expiry.
- `strike_price`: numeric strike.
- `spot_price`: numeric spot at collection time.
- `apr`: normalized APR percentage, e.g. `86.5` for 86.5%.
- `estimated_return`: absolute product yield when available.
- `distance_to_spot_pct`: `(spot - strike) / spot * 100`.
- `min_amount`: product min size.
- `max_amount`: product max size.
- `notional_ccy`: OKX notional currency.
- `raw_payload`: JSON string of the OKX product row.
- `created_at`: database insert timestamp.

`dual_investment_alerts` stores alerts for dedupe and audit.

Columns:

- `id`: integer primary key.
- `quote_id`: references a quote snapshot.
- `alert_key`: deterministic key based on product bucket and alert period.
- `exchange`, `asset`, `quote`, `direction`.
- `product_id`, `exp_time`, `strike_price`.
- `apr`, `apr_delta_pct`, `mean_24h_apr`, `stddev_24h_apr`, `zscore`, `rank_in_expiry`.
- `message`: Telegram message body.
- `sent_to_telegram`: boolean integer.
- `created_at`: database insert timestamp.

Unique constraint:

- `alert_key` is unique so the same strike/expiry condition does not spam repeated messages every poll.

## Processing Flow

One monitor cycle:

1. Fetch spot price for `ETH-USDT`.
2. Fetch Dual Investment products for `ETH/USDT/P`.
3. Normalize each product into a quote snapshot.
4. Compute `term_days` and `distance_to_spot_pct`.
5. Insert all normalized snapshots.
6. Filter candidates by strategy: direction, strike allow-list, max distance, min APR, min/max term.
7. For each candidate, load the prior 24 hours of snapshots with the same `exp_time + strike_price`.
8. Calculate:
   - previous APR delta from the most recent prior snapshot,
   - 24-hour APR mean,
   - 24-hour APR standard deviation,
   - z-score,
   - rank within same expiry for the current collection cycle.
9. Trigger an alert when the candidate passes baseline strategy filters and at least one anomaly condition is true:
   - `zscore >= alertZScore`,
   - `apr_delta_pct >= alertAprDeltaPct`,
   - `apr / mean_24h_apr >= alertMeanMultiplier`,
   - current rank is in top N and previous comparable rank was outside top N.
10. Insert the alert if `alert_key` has not been used.
11. Send Telegram if credentials exist; otherwise log the message.

## Alert Message

Telegram messages use the README format, without emoji dependency:

```text
OKX 双币赢机会
ETH/USDT Buy Low
到期：2026-05-07
目标价：2800 USDT
现价：3012 USDT
价外距离：7.04%
APR：86.5%
15min变化：+18.2%
24h均值：52.1%
Z-score：3.1
建议：这是你可接受接盘区间内的异常高收益档位，可手动检查是否还有额度。
```

## Error Handling

- HTTP failures fail the current cycle but keep the PM2 process alive.
- OKX non-zero response codes are treated as cycle failures and logged with code/message.
- Empty product lists are logged and stored as no-op cycles.
- Missing Telegram credentials do not fail monitoring.
- Invalid numeric fields are skipped per product and logged with product ID.
- SQLite initialization creates required directories and tables.

## PM2 Behavior

The PM2 config starts the compiled service:

```text
npm run build
pm2 start ecosystem.config.cjs
```

The service logs cycle start, fetched counts, inserted counts, candidate counts, alert counts, and Telegram send status. PM2 restarts the process if it crashes.

## Testing

Unit tests cover:

- OKX product normalization.
- APR normalization from OKX `annualizedYield`.
- Distance calculation.
- Term-day calculation.
- Candidate filtering.
- 24-hour mean/stddev/z-score calculation.
- Alert dedupe key generation.
- Telegram message formatting.

Integration-level tests use a temporary SQLite database to verify schema creation, quote inserts, history lookup, and alert dedupe.

## Open Decisions Resolved

- TypeScript is the implementation language.
- PM2 is required for deployment.
- MVP is monitoring-only and will not call trading endpoints.
- SQLite is the database.
- Buy Low maps to OKX `optType=P`.
- `acceptableStrikes` defaults to empty so the first deployment can discover useful levels without editing code.
