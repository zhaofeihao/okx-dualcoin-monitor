import { loadConfig } from "./config.js";
import { createRepository } from "./db.js";
import { OkxClient } from "./okxClient.js";
import { TelegramNotifier } from "./telegram.js";
import { runMonitorCycle } from "./monitor.js";

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

async function runOnce(): Promise<void> {
  try {
    console.log(`[monitor] cycle start ${new Date().toISOString()}`);
    const result = await runMonitorCycle(config, { client, repository, notifier });
    console.log(
      `[monitor] cycle complete fetched=${result.fetchedQuotes} inserted=${result.insertedQuotes} candidates=${result.candidates} alerts=${result.alerts}`
    );
  } catch (error) {
    console.error("[monitor] cycle failed", error);
  }
}

if (process.argv.includes("--once")) {
  await runOnce();
  repository.close();
} else {
  await runOnce();
  const intervalMs = config.pollIntervalMinutes * 60 * 1000;
  setInterval(() => {
    void runOnce();
  }, intervalMs);
}
