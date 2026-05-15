import { filterFundingRateAlerts } from "./fundingRate.js";
import { fetchBinanceFundingRateSnapshots } from "./binanceFundingRateApi.js";
import { fetchOkxFundingRateSnapshots } from "./okxFundingRateApi.js";
import type { BinanceClient } from "./binanceClient.js";
import type { OkxClient } from "./okxClient.js";
import { formatFundingRateAlertMessage, type TelegramNotifier } from "./telegram.js";
import type { AppConfig, FundingRateSnapshot } from "./types.js";

interface FundingRateMonitorDeps {
  client: OkxClient;
  binanceClient?: BinanceClient;
  notifier: Pick<TelegramNotifier, "send">;
  fetchSnapshots?: (client: OkxClient, quoteCcy: string) => Promise<FundingRateSnapshot[]>;
  fetchOkxSnapshots?: (client: OkxClient, quoteCcy: string) => Promise<FundingRateSnapshot[]>;
  fetchBinanceSnapshots?: (
    client: BinanceClient | undefined,
    quoteCcy: string
  ) => Promise<FundingRateSnapshot[]>;
  now?: () => Date;
}

export interface FundingRateMonitorCycleResult {
  fetchedSnapshots: number;
  alerts: number;
  sent: boolean;
}

async function fetchExchangeSnapshots(
  exchange: string,
  fetcher: () => Promise<FundingRateSnapshot[]>
): Promise<FundingRateSnapshot[]> {
  try {
    return await fetcher();
  } catch (error) {
    console.error(`[funding-rate] ${exchange} fetch failed`, error);
    return [];
  }
}

export async function runFundingRateMonitorCycle(
  config: AppConfig,
  deps: FundingRateMonitorDeps
): Promise<FundingRateMonitorCycleResult> {
  if (!config.fundingRate.enabled) {
    return {
      fetchedSnapshots: 0,
      alerts: 0,
      sent: false
    };
  }

  const fetchOkxSnapshots =
    deps.fetchOkxSnapshots ?? deps.fetchSnapshots ?? fetchOkxFundingRateSnapshots;
  const okxSnapshots = await fetchExchangeSnapshots("OKX", () =>
    fetchOkxSnapshots(deps.client, config.fundingRate.quoteCcy)
  );

  let binanceSnapshots: FundingRateSnapshot[] = [];
  if (deps.fetchBinanceSnapshots !== undefined) {
    const fetchBinanceSnapshots = deps.fetchBinanceSnapshots;
    binanceSnapshots = await fetchExchangeSnapshots("BINANCE", () =>
      fetchBinanceSnapshots(deps.binanceClient, config.fundingRate.quoteCcy)
    );
  } else if (deps.binanceClient !== undefined) {
    const binanceClient = deps.binanceClient;
    binanceSnapshots = await fetchExchangeSnapshots("BINANCE", () =>
      fetchBinanceFundingRateSnapshots(binanceClient, config.fundingRate.quoteCcy)
    );
  }

  const snapshots = [...okxSnapshots, ...binanceSnapshots];
  const alerts = filterFundingRateAlerts(snapshots, {
    thresholdPct: config.fundingRate.thresholdPct,
    topN: config.fundingRate.topN
  });

  if (alerts.length === 0) {
    return {
      fetchedSnapshots: snapshots.length,
      alerts: 0,
      sent: false
    };
  }

  const message = formatFundingRateAlertMessage({
    snapshots: alerts,
    thresholdPct: config.fundingRate.thresholdPct,
    scannedAt: deps.now?.() ?? new Date(),
    timeZone: config.fundingRate.timeZone,
    timeZoneLabel: config.fundingRate.timeZoneLabel
  });
  const sent = await deps.notifier.send(message);

  return {
    fetchedSnapshots: snapshots.length,
    alerts: alerts.length,
    sent
  };
}
