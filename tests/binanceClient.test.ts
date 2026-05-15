import { describe, expect, it, vi } from "vitest";
import { BinanceClient } from "../src/binanceClient.js";

describe("BinanceClient", () => {
  it("returns JSON data from successful responses", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ timezone: "UTC", symbols: [] })
    });
    const client = new BinanceClient("https://fapi.binance.com", fetchMock);

    await expect(client.get("/fapi/v1/exchangeInfo")).resolves.toEqual({
      timezone: "UTC",
      symbols: []
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://fapi.binance.com/fapi/v1/exchangeInfo",
      expect.objectContaining({ method: "GET" })
    );
  });

  it("appends query parameters to GET requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ symbol: "BTCUSDT" })
    });
    const client = new BinanceClient("https://fapi.binance.com/", fetchMock);

    await client.get("/fapi/v1/premiumIndex", { symbol: "BTCUSDT" });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://fapi.binance.com/fapi/v1/premiumIndex?symbol=BTCUSDT",
      expect.any(Object)
    );
  });

  it("throws on HTTP errors", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 418,
      text: async () => "banned"
    });
    const client = new BinanceClient("https://fapi.binance.com", fetchMock);

    await expect(client.get("/fapi/v1/exchangeInfo")).rejects.toThrow(
      "Binance HTTP error 418: banned"
    );
  });

  it("throws on Binance error payloads", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ code: -1121, msg: "Invalid symbol." })
    });
    const client = new BinanceClient("https://fapi.binance.com", fetchMock);

    await expect(client.get("/fapi/v1/premiumIndex")).rejects.toThrow(
      "Binance API error -1121: Invalid symbol."
    );
  });
});
