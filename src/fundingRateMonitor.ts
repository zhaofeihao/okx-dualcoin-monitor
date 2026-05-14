import { filterFundingRateAlerts } from "./fundingRate.js";
import { fetchOkxFundingRateSnapshots } from "./okxFundingRateApi.js";
import type { OkxClient } from "./okxClient.js";
import { formatFundingRateAlertMessage, type TelegramNotifier } from "./telegram.js";
import type { AppConfig, FundingRateSnapshot } from "./types.js";

interface FundingRateMonitorDeps {
  client: OkxClient;
  notifier: Pick<TelegramNotifier, "send">;
  fetchSnapshots?: (client: OkxClient, quoteCcy: string) => Promise<FundingRateSnapshot[]>;
  now?: () => Date;
}

export interface FundingRateMonitorCycleResult {
  fetchedSnapshots: number;
  alerts: number;
  sent: boolean;
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

  const fetchSnapshots = deps.fetchSnapshots ?? fetchOkxFundingRateSnapshots;
  const snapshots = await fetchSnapshots(deps.client, config.fundingRate.quoteCcy);
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
    scannedAt: deps.now?.() ?? new Date()
  });
  const sent = await deps.notifier.send(message);

  return {
    fetchedSnapshots: snapshots.length,
    alerts: alerts.length,
    sent
  };
}
