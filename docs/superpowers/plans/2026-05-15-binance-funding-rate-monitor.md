# Binance Funding Rate Monitor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Binance USD-S-M perpetual funding-rate monitoring alongside the existing OKX funding-rate monitor.

**Architecture:** Add a small unsigned Binance REST client and a Binance funding-rate adapter that normalize public USD-S-M data into the existing `FundingRateSnapshot` type. Update the monitor orchestration to fetch OKX and Binance independently, combine snapshots, and keep the existing filter, sort, top-N, and Telegram sending behavior.

**Tech Stack:** TypeScript, Vitest, Node fetch, existing Telegram notifier.

---

### Task 1: Shared Types and Config

**Files:**
- Modify: `src/types.ts`
- Modify: `src/config.ts`
- Test: `tests/config.test.ts`

- [ ] Write failing config tests for `binanceBaseUrl` default and `BINANCE_BASE_URL` override.
- [ ] Extend `AppConfig` with `binanceBaseUrl`.
- [ ] Extend `FundingRateSnapshot.exchange` to `"OKX" | "BINANCE"`.
- [ ] Run `npm test -- tests/config.test.ts`.

### Task 2: Binance Client

**Files:**
- Create: `src/binanceClient.ts`
- Test: `tests/binanceClient.test.ts`

- [ ] Write failing tests for successful JSON GET, HTTP error, and Binance error payload handling.
- [ ] Implement an unsigned REST client with `get<T>(path, query)`.
- [ ] Run `npm test -- tests/binanceClient.test.ts`.

### Task 3: Binance Funding Adapter

**Files:**
- Create: `src/binanceFundingRateApi.ts`
- Modify: `src/types.ts`
- Test: `tests/binanceFundingRateApi.test.ts`

- [ ] Write failing tests for Binance symbol filtering, funding-rate normalization, and snapshot fetching.
- [ ] Define Binance exchange-info and premium-index row types.
- [ ] Normalize `lastFundingRate` to percentage points and `nextFundingTime` to `fundingTime`.
- [ ] Run `npm test -- tests/binanceFundingRateApi.test.ts`.

### Task 4: Monitor and Telegram Integration

**Files:**
- Modify: `src/fundingRateMonitor.ts`
- Modify: `src/telegram.ts`
- Modify: `src/index.ts`
- Test: `tests/fundingRateMonitor.test.ts`
- Test: `tests/telegram.test.ts`

- [ ] Write failing tests that one monitor cycle combines OKX and Binance snapshots.
- [ ] Write failing tests that funding-rate messages include exchange labels.
- [ ] Update monitor dependencies to accept OKX and Binance clients.
- [ ] Catch per-exchange fetch failures and continue with successful exchanges.
- [ ] Update startup to instantiate `BinanceClient`.
- [ ] Run `npm test -- tests/fundingRateMonitor.test.ts tests/telegram.test.ts`.

### Task 5: Documentation and Verification

**Files:**
- Modify: `README.md`

- [ ] Document Binance funding-rate monitoring and `BINANCE_BASE_URL`.
- [ ] Run `npm test`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run build`.
