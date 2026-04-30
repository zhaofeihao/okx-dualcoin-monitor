import type { AlertEvaluation } from "./types.js";

type FetchLike = typeof fetch;

function formatNumber(value: number | null, digits = 2): string {
  return value === null ? "N/A" : value.toFixed(digits);
}

function formatDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function formatSignedPercent(value: number | null): string {
  if (value === null) {
    return "N/A";
  }
  const prefix = value >= 0 ? "+" : "";
  return `${prefix}${value.toFixed(2)}%`;
}

export function formatAlertMessage(evaluation: AlertEvaluation): string {
  const quote = evaluation.quote;
  return [
    "OKX 双币赢机会",
    `${quote.asset}/${quote.quote} Buy Low`,
    `到期：${formatDate(quote.expTime)}`,
    `目标价：${formatNumber(quote.strikePrice, 0)} ${quote.quote}`,
    `现价：${formatNumber(quote.spotPrice, 2)} ${quote.quote}`,
    `价外距离：${formatNumber(quote.distanceToSpotPct, 2)}%`,
    `APR：${formatNumber(quote.apr, 2)}%`,
    `15min变化：${formatSignedPercent(evaluation.aprDeltaPct)}`,
    `24h均值：${formatNumber(evaluation.mean24hApr, 2)}%`,
    `Z-score：${formatNumber(evaluation.zscore, 2)}`,
    `排名：#${evaluation.rankInExpiry}`,
    `触发原因：${evaluation.reasons.join(", ")}`,
    "建议：这是你可接受接盘区间内的异常高收益档位，可手动检查是否还有额度。"
  ].join("\n");
}

export class TelegramNotifier {
  private readonly botToken: string | undefined;
  private readonly chatId: string | undefined;
  private readonly fetchImpl: FetchLike;

  constructor(botToken?: string, chatId?: string, fetchImpl: FetchLike = fetch) {
    this.botToken = botToken;
    this.chatId = chatId;
    this.fetchImpl = fetchImpl;
  }

  async send(message: string): Promise<boolean> {
    if (!this.botToken || !this.chatId) {
      console.log(message);
      return false;
    }

    const response = await this.fetchImpl(
      `https://api.telegram.org/bot${this.botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: this.chatId,
          text: message,
          disable_web_page_preview: true
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Telegram HTTP error: ${await response.text()}`);
    }

    return true;
  }
}
