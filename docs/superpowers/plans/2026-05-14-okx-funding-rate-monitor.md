# OKX Funding Rate Monitor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a reusable OKX USDT perpetual funding-rate monitor that polls independently, filters `|fundingRate| > 0.3%`, and sends a readable Telegram summary.

**Architecture:** Keep funding-rate domain logic separate from OKX REST details and monitor orchestration. Reuse the existing `OkxClient` and `TelegramNotifier`; schedule funding-rate cycles separately from the existing dual-investment cycle.

**Tech Stack:** Node.js, TypeScript, Vitest, native `fetch`, existing Telegram sender.

---

## File Structure

- Create `src/fundingRate.ts`: normalized types, filtering, sorting, and display helpers.
- Create `src/okxFundingRateApi.ts`: OKX swap instrument filtering and funding-rate fetching.
- Create `src/fundingRateMonitor.ts`: one-cycle funding-rate orchestration.
- Modify `src/types.ts`: add funding-rate config and OKX response types.
- Modify `src/config.ts`: parse funding-rate env values.
- Modify `src/telegram.ts`: format funding-rate alert summaries.
- Modify `src/index.ts`: run two independent intervals.
- Modify `.env.example` and `README.md`: document configuration and behavior.
- Create tests in `tests/fundingRate.test.ts`, `tests/okxFundingRateApi.test.ts`, and `tests/fundingRateMonitor.test.ts`.

## Tasks

### Task 1: Config And Domain Tests

**Files:**
- Modify: `src/types.ts`
- Modify: `src/config.ts`
- Create: `src/fundingRate.ts`
- Test: `tests/config.test.ts`
- Test: `tests/fundingRate.test.ts`

- [ ] Write failing tests for funding-rate config defaults and env overrides.
- [ ] Write failing tests for threshold filtering and absolute-value sorting.
- [ ] Implement the new config and domain helpers.
- [ ] Run `npm test -- tests/config.test.ts tests/fundingRate.test.ts`.

### Task 2: OKX Funding API

**Files:**
- Create: `src/okxFundingRateApi.ts`
- Test: `tests/okxFundingRateApi.test.ts`

- [ ] Write failing tests for USDT linear swap filtering.
- [ ] Write failing tests for OKX funding-rate decimal-to-percent normalization.
- [ ] Implement OKX API fetchers using the existing `OkxClient`.
- [ ] Run `npm test -- tests/okxFundingRateApi.test.ts`.

### Task 3: Telegram Formatting

**Files:**
- Modify: `src/telegram.ts`
- Test: `tests/telegram.test.ts`

- [ ] Write a failing test for a readable funding-rate alert summary.
- [ ] Implement `formatFundingRateAlertMessage`.
- [ ] Run `npm test -- tests/telegram.test.ts`.

### Task 4: Funding Monitor Orchestration

**Files:**
- Create: `src/fundingRateMonitor.ts`
- Test: `tests/fundingRateMonitor.test.ts`

- [ ] Write failing tests for send-on-matches and no-send-on-empty behavior.
- [ ] Implement one funding-rate monitor cycle with injectable dependencies.
- [ ] Run `npm test -- tests/fundingRateMonitor.test.ts`.

### Task 5: Entrypoint And Docs

**Files:**
- Modify: `src/index.ts`
- Modify: `.env.example`
- Modify: `README.md`

- [ ] Update startup to schedule dual-investment and funding-rate cycles independently.
- [ ] Document funding-rate environment variables and behavior.
- [ ] Run `npm test`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run build`.
