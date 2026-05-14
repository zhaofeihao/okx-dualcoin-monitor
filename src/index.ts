import { loadConfig } from "./config.js";
import { createRepository } from "./db.js";
import { OkxClient } from "./okxClient.js";
import { TelegramNotifier } from "./telegram.js";
import { runMonitorCycle } from "./monitor.js";
import { runFundingRateMonitorCycle } from "./fundingRateMonitor.js";

const config = loadConfig();
const repository = createRepository(config.sqlitePath);
repository.migrate();

function okxCredentials() {
  if (
    config.okxApiKey === undefined ||
    config.okxSecretKey === undefined ||
    config.okxPassphrase === undefined
  ) {
    return undefined;
  }

  return {
    apiKey: config.okxApiKey,
    secretKey: config.okxSecretKey,
    passphrase: config.okxPassphrase
  };
}

const client = new OkxClient(config.okxBaseUrl, fetch, okxCredentials());
const notifier = new TelegramNotifier(config.telegramBotToken, config.telegramChatId);

async function runDualInvestmentOnce(): Promise<void> {
  try {
    console.log(`[dual-investment] cycle start ${new Date().toISOString()}`);
    const result = await runMonitorCycle(config, { client, repository, notifier });
    console.log(
      `[dual-investment] cycle complete fetched=${result.fetchedQuotes} inserted=${result.insertedQuotes} candidates=${result.candidates} alerts=${result.alerts}`
    );
  } catch (error) {
    console.error("[dual-investment] cycle failed", error);
  }
}

async function runFundingRatesOnce(): Promise<void> {
  if (!config.fundingRate.enabled) {
    console.log("[funding-rate] monitor disabled");
    return;
  }

  try {
    console.log(`[funding-rate] cycle start ${new Date().toISOString()}`);
    const result = await runFundingRateMonitorCycle(config, { client, notifier });
    console.log(
      `[funding-rate] cycle complete fetched=${result.fetchedSnapshots} alerts=${result.alerts} sent=${result.sent}`
    );
  } catch (error) {
    console.error("[funding-rate] cycle failed", error);
  }
}

function schedule(name: string, intervalMinutes: number, run: () => Promise<void>): void {
  const intervalMs = intervalMinutes * 60 * 1000;
  console.log(`[${name}] interval=${intervalMinutes}m`);
  setInterval(() => {
    void run();
  }, intervalMs);
}

if (process.argv.includes("--once")) {
  await runDualInvestmentOnce();
  await runFundingRatesOnce();
  repository.close();
} else {
  await runDualInvestmentOnce();
  await runFundingRatesOnce();
  schedule("dual-investment", config.pollIntervalMinutes, runDualInvestmentOnce);
  if (config.fundingRate.enabled) {
    schedule("funding-rate", config.fundingRate.intervalMinutes, runFundingRatesOnce);
  }
}
