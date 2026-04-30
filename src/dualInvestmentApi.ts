import { normalizeDualInvestmentProduct } from "./dualInvestment.js";
import type { OkxClient } from "./okxClient.js";
import type { Direction, DualInvestmentQuote, OkxDualInvestmentProduct } from "./types.js";

interface FetchProductsInput {
  client: OkxClient;
  asset: string;
  quote: string;
  direction: Direction;
  spotPrice: number;
  collectedAt: Date;
}

interface NestedProductsResponse {
  products: OkxDualInvestmentProduct[];
}

export function extractDualInvestmentProducts(
  response: OkxDualInvestmentProduct[] | NestedProductsResponse | unknown
): OkxDualInvestmentProduct[] {
  if (Array.isArray(response)) {
    return response;
  }

  if (
    response !== null &&
    typeof response === "object" &&
    "products" in response &&
    Array.isArray((response as NestedProductsResponse).products)
  ) {
    return (response as NestedProductsResponse).products;
  }

  throw new Error("Unexpected OKX dual investment products response shape");
}

export async function fetchDualInvestmentQuotes(
  input: FetchProductsInput
): Promise<DualInvestmentQuote[]> {
  const response = await input.client.get<OkxDualInvestmentProduct[] | NestedProductsResponse>(
    "/api/v5/finance/sfp/dcd/products",
    {
      baseCcy: input.asset,
      quoteCcy: input.quote,
      optType: "P"
    }
  );
  const products = extractDualInvestmentProducts(response);

  return products
    .filter((product) => product.optType === "P")
    .map((product) =>
      normalizeDualInvestmentProduct(product, {
        collectedAt: input.collectedAt,
        spotPrice: input.spotPrice,
        direction: input.direction
      })
    );
}
