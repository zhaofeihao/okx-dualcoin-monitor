type FetchLike = typeof fetch;

interface BinanceErrorPayload {
  code: number;
  msg: string;
}

function isBinanceErrorPayload(value: unknown): value is BinanceErrorPayload {
  return (
    typeof value === "object" &&
    value !== null &&
    "code" in value &&
    "msg" in value &&
    typeof (value as { code: unknown }).code === "number" &&
    typeof (value as { msg: unknown }).msg === "string"
  );
}

export class BinanceClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: FetchLike;

  constructor(baseUrl: string, fetchImpl: FetchLike = fetch) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.fetchImpl = fetchImpl;
  }

  async get<T>(path: string, query: Record<string, string> = {}): Promise<T> {
    const url = new URL(path, this.baseUrl);
    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, value);
    }

    const response = await this.fetchImpl(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" }
    });
    const body = await response.text();

    if (!response.ok) {
      throw new Error(`Binance HTTP error ${response.status}: ${body}`);
    }

    const parsed = JSON.parse(body) as unknown;
    if (isBinanceErrorPayload(parsed)) {
      throw new Error(`Binance API error ${parsed.code}: ${parsed.msg}`);
    }

    return parsed as T;
  }
}
