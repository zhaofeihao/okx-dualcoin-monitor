import { describe, expect, it, vi } from "vitest";
import { OkxClient } from "../src/okxClient.js";

describe("OkxClient", () => {
  it("returns data from OKX successful responses", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          code: "0",
          msg: "",
          data: [{ last: "3012.1" }]
        })
    });
    const client = new OkxClient("https://www.okx.com", fetchMock);

    await expect(client.get("/api/v5/market/ticker", { instId: "ETH-USDT" })).resolves.toEqual([
      { last: "3012.1" }
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://www.okx.com/api/v5/market/ticker?instId=ETH-USDT",
      { method: "GET", headers: { Accept: "application/json" } }
    );
  });

  it("accepts numeric zero OKX success codes", async () => {
    const client = new OkxClient(
      "https://www.okx.com",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            code: 0,
            msg: "",
            data: [{ productId: "ETH-USDT-260507-2800-P" }]
          })
      })
    );

    await expect(client.get("/api/v5/finance/sfp/dcd/products")).resolves.toEqual([
      { productId: "ETH-USDT-260507-2800-P" }
    ]);
  });

  it("throws on non-zero OKX response codes", async () => {
    const client = new OkxClient(
      "https://www.okx.com",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ code: "50001", msg: "error", data: [] })
      })
    );

    await expect(client.get("/api/v5/finance/sfp/dcd/products")).rejects.toThrow(
      "OKX API error 50001: error"
    );
  });

  it("signs requests when OKX credentials are configured", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ code: "0", msg: "", data: [] })
    });
    const client = new OkxClient("https://www.okx.com", fetchMock, {
      apiKey: "api-key",
      secretKey: "secret-key",
      passphrase: "passphrase",
      now: () => "2026-04-30T10:00:00.000Z"
    });

    await client.get("/api/v5/finance/sfp/dcd/products", {
      baseCcy: "ETH",
      quoteCcy: "USDT",
      optType: "P"
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://www.okx.com/api/v5/finance/sfp/dcd/products?baseCcy=ETH&quoteCcy=USDT&optType=P",
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "OK-ACCESS-KEY": "api-key",
          "OK-ACCESS-PASSPHRASE": "passphrase",
          "OK-ACCESS-TIMESTAMP": "2026-04-30T10:00:00.000Z",
          "OK-ACCESS-SIGN": "EyEuPMatudnIRVYeUQE4TFQ+9k1nE0dQ0tHyw9t+5So="
        }
      }
    );
  });
});
