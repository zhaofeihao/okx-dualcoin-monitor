import { createHmac } from "node:crypto";

type FetchLike = typeof fetch;

interface OkxEnvelope<T> {
  code: string | number;
  msg: string;
  data: T;
}

interface OkxCredentials {
  apiKey: string;
  secretKey: string;
  passphrase: string;
  now?: () => string;
}

export class OkxClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: FetchLike;
  private readonly credentials: OkxCredentials | undefined;

  constructor(baseUrl: string, fetchImpl: FetchLike = fetch, credentials?: OkxCredentials) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.fetchImpl = fetchImpl;
    this.credentials = credentials;
  }

  async get<T>(path: string, query: Record<string, string> = {}): Promise<T> {
    const url = new URL(path, this.baseUrl);
    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, value);
    }

    const response = await this.fetchImpl(url.toString(), {
      method: "GET",
      headers: this.buildHeaders("GET", `${url.pathname}${url.search}`)
    });
    const body = await response.text();

    if (!response.ok) {
      throw new Error(`OKX HTTP error ${response.status}: ${body}`);
    }

    const parsed = JSON.parse(body) as OkxEnvelope<T>;
    if (String(parsed.code) !== "0") {
      throw new Error(`OKX API error ${parsed.code}: ${parsed.msg}`);
    }

    return parsed.data;
  }

  private buildHeaders(method: string, requestPath: string): Record<string, string> {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (this.credentials === undefined) {
      return headers;
    }

    const timestamp = this.credentials.now?.() ?? new Date().toISOString();
    const prehash = `${timestamp}${method.toUpperCase()}${requestPath}`;
    const sign = createHmac("sha256", this.credentials.secretKey)
      .update(prehash)
      .digest("base64");

    return {
      ...headers,
      "OK-ACCESS-KEY": this.credentials.apiKey,
      "OK-ACCESS-SIGN": sign,
      "OK-ACCESS-TIMESTAMP": timestamp,
      "OK-ACCESS-PASSPHRASE": this.credentials.passphrase
    };
  }
}
