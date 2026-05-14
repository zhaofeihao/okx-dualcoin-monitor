import type { FundingRateSnapshot } from "./types.js";

interface FundingRateFilterOptions {
  thresholdPct: number;
  topN: number;
}

export function filterFundingRateAlerts(
  snapshots: FundingRateSnapshot[],
  options: FundingRateFilterOptions
): FundingRateSnapshot[] {
  return snapshots
    .filter((snapshot) => Math.abs(snapshot.fundingRatePct) > options.thresholdPct)
    .sort((left, right) => Math.abs(right.fundingRatePct) - Math.abs(left.fundingRatePct))
    .slice(0, options.topN);
}
