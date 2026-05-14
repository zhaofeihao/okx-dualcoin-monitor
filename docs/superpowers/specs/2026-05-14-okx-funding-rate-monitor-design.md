# OKX Funding Rate Monitor Design

## Goal

Add a reusable funding-rate monitor for OKX USDT-margined perpetual swaps. The monitor polls every 30 minutes by default, finds contracts whose absolute funding rate is greater than 0.3%, and sends a readable Telegram summary. It does not place trades or inspect account positions.

## Scope

In scope:

- Fetch OKX public swap instruments.
- Monitor only live USDT-margined linear swaps, such as `BTC-USDT-SWAP`.
- Fetch current funding-rate data for each eligible instrument.
- Normalize OKX decimal funding rates into percentage values.
- Filter by absolute funding-rate percentage.
- Format one compact Telegram summary per cycle.
- Keep code boundaries reusable so other exchanges or services can reuse the domain logic later.

Out of scope:

- WebSocket streaming.
- Historical persistence or dedupe tables.
- Automatic trading, position checks, or account-risk checks.
- Non-USDT swap contracts in the first version.

## Configuration

New environment variables:

- `FUNDING_RATE_ENABLED`: defaults to `true`.
- `FUNDING_RATE_INTERVAL_MINUTES`: defaults to `30`.
- `FUNDING_RATE_THRESHOLD_PCT`: defaults to `0.3`.
- `FUNDING_RATE_QUOTE_CCY`: defaults to `USDT`.
- `FUNDING_RATE_TOP_N`: defaults to `20`.

The funding monitor uses the existing `OKX_BASE_URL`, `TELEGRAM_BOT_TOKEN`, and `TELEGRAM_CHAT_ID`.

## Architecture

New modules:

- `src/fundingRate.ts`: exchange-neutral funding-rate types, threshold filtering, sorting, and message formatting inputs.
- `src/okxFundingRateApi.ts`: OKX public instrument and funding-rate fetchers.
- `src/fundingRateMonitor.ts`: one-cycle orchestration and Telegram sending.

Changed modules:

- `src/types.ts`: add funding-rate config and normalized snapshot types.
- `src/config.ts`: parse funding-rate env values.
- `src/telegram.ts`: add funding-rate alert formatter.
- `src/index.ts`: schedule the existing dual-investment monitor and the new funding-rate monitor independently.
- `.env.example` and `README.md`: document the new settings.

## OKX API Mapping

Instrument discovery:

```text
GET /api/v5/public/instruments?instType=SWAP
```

Eligible instruments must satisfy:

- `instType === "SWAP"`.
- `ctType === "linear"`.
- `settleCcy === "USDT"`.
- `state === "live"`.
- `instId` ends with `-USDT-SWAP`.

Funding-rate lookup:

```text
GET /api/v5/public/funding-rate?instId=BTC-USDT-SWAP
```

OKX returns `fundingRate` as a decimal. The monitor stores and displays `fundingRatePct = Number(fundingRate) * 100`, so `0.003` becomes `0.3%`.

## Processing Flow

One funding-rate cycle:

1. Load OKX swap instruments.
2. Filter to live USDT linear swaps.
3. Fetch current funding rate for each eligible instrument.
4. Normalize each row to a `FundingRateSnapshot`.
5. Filter where `Math.abs(fundingRatePct) > thresholdPct`.
6. Sort by absolute funding-rate percentage descending.
7. Keep the configured top N.
8. Send one Telegram message if any rows match; otherwise only log a no-op result.

## Telegram Message

Message structure:

```text
OKX USDT 永续资金费率预警
阈值：|资金费率| > 0.30%
扫描时间：2026-05-14 22:30

1. BTC-USDT-SWAP  +0.3750%  多付空收
   结算时间：2026-05-15 00:00
2. XYZ-USDT-SWAP  -0.8200%  空付多收
   结算时间：2026-05-15 00:00
```

Positive funding means longs pay shorts. Negative funding means shorts pay longs.

## Error Handling

- A failed funding-rate request for one instrument is logged and skipped.
- If instrument discovery fails, the funding-rate cycle fails and the process keeps running.
- Missing Telegram credentials log the message locally through the existing notifier.
- Invalid numeric fields are skipped instead of crashing the whole cycle.

## Testing

Tests cover:

- Funding-rate config defaults and env overrides.
- USDT linear swap instrument filtering.
- Funding-rate normalization from OKX decimal values.
- Threshold filtering and absolute-value sorting.
- Telegram message formatting.
- Funding-rate monitor orchestration with mocked API and notifier.
