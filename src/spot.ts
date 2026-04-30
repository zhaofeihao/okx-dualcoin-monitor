import type { OkxClient } from "./okxClient.js";

interface OkxTicker {
  last: string;
}

export async function fetchSpotPrice(
  client: OkxClient,
  asset: string,
  quote: string
): Promise<number> {
  const data = await client.get<OkxTicker[]>("/api/v5/market/ticker", {
    instId: `${asset}-${quote}`
  });
  const first = data[0];
  if (first === undefined) {
    throw new Error(`No ticker returned for ${asset}-${quote}`);
  }

  const price = Number(first.last);
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error(`Invalid ticker price for ${asset}-${quote}: ${first.last}`);
  }
  return price;
}
