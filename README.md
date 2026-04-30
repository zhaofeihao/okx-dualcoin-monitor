# OKX Dualcoin Monitor

TypeScript service for monitoring OKX Dual Investment ETH/USDT Buy Low opportunities. It records product snapshots in SQLite, detects APR anomalies by strike and expiry, and sends Telegram alerts. The MVP is monitoring-only and does not place orders.

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

## Notes

- Buy Low maps to OKX Dual Investment `optType=P`.
- Spot price is fetched from `GET /api/v5/market/ticker?instId=ETH-USDT`.
- Product snapshots are fetched from `GET /api/v5/finance/sfp/dcd/products?baseCcy=ETH&quoteCcy=USDT&optType=P`; OKX currently requires signed API headers for this endpoint.
- The service intentionally avoids OKX trading endpoints in the MVP.
