# OKX Dualcoin Monitor

TypeScript service for monitoring OKX Dual Investment ETH/USDT Buy Low opportunities and OKX USDT-margined perpetual funding-rate extremes. It records Dual Investment product snapshots in SQLite, detects APR anomalies by strike and expiry, and sends Telegram alerts. It also polls public perpetual funding rates and sends a summary when `|fundingRate|` is above the configured threshold. The service is monitoring-only and does not place orders.

## Setup

```bash
npm install
cp .env.example .env
```

Edit `.env` for your strategy and Telegram credentials.

Key settings:

- `OKX_API_KEY`, `OKX_SECRET_KEY`, `OKX_PASSPHRASE`: required for the Dual Investment products endpoint. Use an OKX API key with read permission.
- `STRATEGY_ACCEPTABLE_STRIKES`: comma-separated target prices, e.g. `2600,2700,2800`. Leave empty to allow any strike that passes the distance filter.
- `STRATEGY_MAX_DISTANCE_FROM_SPOT_PCT`: maximum out-of-money distance.
- `STRATEGY_MIN_APR`: minimum APR percentage.
- `STRATEGY_MIN_TERM_DAYS` / `STRATEGY_MAX_TERM_DAYS`: allowed expiry range.
- `STRATEGY_ALERT_ZSCORE`: z-score alert threshold.
- `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`: optional. If absent, alerts are logged instead of sent.

Funding-rate settings:

- `FUNDING_RATE_ENABLED`: enable/disable OKX perpetual funding-rate monitoring. Defaults to `true`.
- `FUNDING_RATE_INTERVAL_MINUTES`: funding-rate polling interval. Defaults to `30`.
- `FUNDING_RATE_THRESHOLD_PCT`: alert threshold in percentage points. `0.3` means `0.3%`; OKX API value `0.003` is displayed as `0.3%`.
- `FUNDING_RATE_QUOTE_CCY`: quote currency to monitor. Defaults to `USDT`; the first version only scans USDT-margined linear swaps.
- `FUNDING_RATE_TOP_N`: maximum number of contracts included in one Telegram summary.
- `FUNDING_RATE_TIME_ZONE`: display time zone for funding-rate alerts. Defaults to `Asia/Shanghai`.
- `FUNDING_RATE_TIME_ZONE_LABEL`: display label appended to alert times. Defaults to `UTC+8`.

## Run Once

```bash
npm run monitor:once
```

## Development

```bash
npm test
npm run typecheck
npm run build
```

## PM2 Deployment

```bash
npm run build
pm2 start ecosystem.config.cjs
pm2 logs okx-dualcoin-monitor
```

To restart after changes:

```bash
npm run build
pm2 restart okx-dualcoin-monitor
```

## Data

SQLite defaults to:

```text
./data/okx-dualcoin-monitor.sqlite
```

Tables:

- `dual_investment_quotes`: every 15-minute product snapshot.
- `dual_investment_alerts`: deduplicated alert records.

Funding-rate alerts are not persisted in SQLite in this version. Each funding-rate cycle sends at most one summary message when matching contracts exist.

## Notes

- Buy Low maps to OKX Dual Investment `optType=P`.
- Spot price is fetched from `GET /api/v5/market/ticker?instId=ETH-USDT`.
- Product snapshots are fetched from `GET /api/v5/finance/sfp/dcd/products?baseCcy=ETH&quoteCcy=USDT&optType=P`; OKX currently requires signed API headers for this endpoint.
- USDT perpetual instruments are fetched from `GET /api/v5/public/instruments?instType=SWAP`, then current funding is fetched from `GET /api/v5/public/funding-rate?instId=...`.
- The service intentionally avoids OKX trading endpoints in the MVP.
