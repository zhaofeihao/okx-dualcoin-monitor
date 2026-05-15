# Binance Funding Rate Monitor Design

## Goal

Extend the existing funding-rate monitor so it scans Binance USD-S-margined perpetual contracts in addition to OKX USDT perpetual swaps, then sends one combined Telegram summary using the current threshold, sorting, and top-N behavior.

## Scope

- Add Binance public REST access for USD-S-M Futures market data.
- Fetch Binance trading perpetual contracts quoted in the configured quote currency.
- Fetch current Binance funding data from the mark price endpoint.
- Normalize Binance funding rows into the existing `FundingRateSnapshot` shape.
- Keep one funding-rate schedule and one alert message per cycle.
- Do not place orders, sign Binance requests, or persist funding-rate snapshots.

## Binance API Mapping

Binance USD-S-M Futures public API uses `https://fapi.binance.com` by default.

- Symbol metadata: `GET /fapi/v1/exchangeInfo`
- Mark price and latest funding rate: `GET /fapi/v1/premiumIndex`

Eligible symbols are `contractType=PERPETUAL`, `status=TRADING`, and `quoteAsset` matching `FUNDING_RATE_QUOTE_CCY`.

## Data Flow

One funding-rate cycle:

1. Fetch OKX snapshots with the existing OKX adapter.
2. Fetch Binance snapshots with the new Binance adapter.
3. Combine snapshots.
4. Filter by `Math.abs(fundingRatePct) > FUNDING_RATE_THRESHOLD_PCT`.
5. Sort by absolute funding-rate percentage descending.
6. Send one Telegram summary containing exchange labels per row.

## Configuration

- `BINANCE_BASE_URL`: defaults to `https://fapi.binance.com`.
- Existing funding-rate settings stay shared across exchanges.

## Error Handling

- If one exchange fetch fails, log the error and continue with snapshots from the other exchange.
- If both exchanges produce no alert candidates, do not send Telegram.
- Binance HTTP non-2xx responses and error payloads fail that exchange fetch.

## Testing

- Config default and override for `BINANCE_BASE_URL`.
- Binance client JSON handling and error handling.
- Binance funding normalization and quote filtering.
- Funding monitor combines OKX and Binance snapshots and sends one summary.
- Telegram summary includes exchange labels.
