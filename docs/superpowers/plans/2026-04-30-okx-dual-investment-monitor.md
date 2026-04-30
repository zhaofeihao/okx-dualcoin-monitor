# OKX Dual Investment Monitor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a TypeScript + SQLite + PM2 service that monitors OKX ETH/USDT Buy Low Dual Investment products, stores snapshots, detects APR anomalies, and sends Telegram alerts without automatic trading.

**Architecture:** The service is split into focused modules: configuration, OKX HTTP access, product normalization, SQLite repository, analytics, alert formatting, Telegram delivery, and monitor orchestration. The entrypoint initializes the database and runs the monitor on a fixed interval suitable for PM2.

**Tech Stack:** Node.js, TypeScript, Vitest, SQLite via `better-sqlite3`, PM2-compatible process config, native `fetch`.

---

## File Structure

- `package.json`: npm scripts and dependencies.
- `tsconfig.json`: TypeScript compiler settings.
- `vitest.config.ts`: test runner config.
- `.env.example`: deployable configuration template.
- `.gitignore`: local build/data/env ignores.
- `ecosystem.config.cjs`: PM2 process definition.
- `src/types.ts`: shared domain types.
- `src/config.ts`: environment parsing and default strategy.
- `src/okxClient.ts`: OKX REST wrapper.
- `src/dualInvestment.ts`: OKX Dual Investment product normalization.
- `src/spot.ts`: OKX spot ticker lookup.
- `src/db.ts`: SQLite schema and repository methods.
- `src/analytics.ts`: filtering, statistics, ranks, alert decisions.
- `src/telegram.ts`: Telegram sender and message formatter.
- `src/monitor.ts`: one-cycle orchestration.
- `src/index.ts`: service startup and interval loop.
- `tests/*.test.ts`: unit and integration coverage for normalization, analytics, DB, config, alerts.

## Tasks

### Task 1: Project Scaffold

- [ ] Create npm/TypeScript/Vitest configuration files.
- [ ] Install runtime and dev dependencies.
- [ ] Add PM2 config and environment example.
- [ ] Verify `npm run typecheck` reaches source-file errors only after tests are added.

### Task 2: Domain, Config, and Normalization

- [ ] Write failing tests for strategy defaults, env parsing, APR normalization, term days, and distance calculations.
- [ ] Implement `src/types.ts`, `src/config.ts`, and `src/dualInvestment.ts`.
- [ ] Run targeted tests and typecheck.

### Task 3: Analytics

- [ ] Write failing tests for candidate filtering, mean/stddev/z-score, APR delta, ranking, alert decision, and alert dedupe key generation.
- [ ] Implement `src/analytics.ts`.
- [ ] Run targeted tests and typecheck.

### Task 4: SQLite Repository

- [ ] Write failing integration tests using a temporary SQLite database.
- [ ] Implement schema creation, quote insertion, history lookup, rank lookup, and alert insertion with dedupe.
- [ ] Run targeted DB tests.

### Task 5: OKX, Telegram, and Monitor Orchestration

- [ ] Write tests for OKX response parsing and Telegram message formatting.
- [ ] Implement `src/okxClient.ts`, `src/spot.ts`, `src/telegram.ts`, `src/monitor.ts`, and `src/index.ts`.
- [ ] Ensure monitor cycles log errors without crashing the interval process.

### Task 6: Verification and Documentation

- [ ] Run `npm test`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run build`.
- [ ] Add README usage notes if the root README is absent.
- [ ] Summarize configuration, PM2 usage, and any limitations.
