import type {
  EtfHoldingsProxyResponse,
  EtfHoldingsProxySymbol,
} from "../types/etfHoldingsProxy";

export class EtfHoldingsProxyClientError extends Error {
  payload?: EtfHoldingsProxyResponse | { errors?: string[]; message?: string };

  constructor(
    message: string,
    payload?: EtfHoldingsProxyResponse | { errors?: string[]; message?: string },
  ) {
    super(message);
    this.name = "EtfHoldingsProxyClientError";
    this.payload = payload;
  }
}

export async function fetchEtfHoldingsViaProxy(
  symbol: EtfHoldingsProxySymbol,
): Promise<EtfHoldingsProxyResponse> {
  const response = await fetch(
    `/api/etf-holdings?symbol=${encodeURIComponent(symbol)}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    },
  );
  const payload = (await response.json().catch(() => undefined)) as
    | EtfHoldingsProxyResponse
    | { errors?: string[]; message?: string }
    | undefined;

  if (!response.ok) {
    const message =
      payload && "errors" in payload && payload.errors?.[0]
        ? payload.errors[0]
        : payload && "message" in payload && payload.message
          ? payload.message
          : `ETF holdings proxy request failed with HTTP ${response.status}.`;

    throw new EtfHoldingsProxyClientError(message, payload);
  }

  return payload as EtfHoldingsProxyResponse;
}
