# Vercel API Testing

Production base URL:

`https://etf-lookthrough-analyzer.vercel.app`

## ETF Holdings Proxy Routes

Test these routes after each proxy deployment:

- `https://etf-lookthrough-analyzer.vercel.app/api/etf-holdings?symbol=0050`
- `https://etf-lookthrough-analyzer.vercel.app/api/etf-holdings?symbol=00646`
- `https://etf-lookthrough-analyzer.vercel.app/api/etf-holdings?symbol=00981A`
- `https://etf-lookthrough-analyzer.vercel.app/api/etf-holdings?symbol=00994A`
- `https://etf-lookthrough-analyzer.vercel.app/api/etf-holdings?symbol=BAD`

The invalid symbol route should return HTTP `400`. Supported symbols should return JSON with this shape:

```json
{
  "symbol": "00994A",
  "status": "ok",
  "source": "FSITC 00994A official holdings",
  "sourceUrl": "https://www.fsitc.com.tw/WebAPI.aspx/Get_hd",
  "fetchedAt": "2026-05-22T00:00:00.000Z",
  "asOfDate": "2026-05-21",
  "constituents": [],
  "warnings": [],
  "errors": []
}
```

## Step 34 Result Notes

Initial production test on `2026-05-22` returned HTTP `500 FUNCTION_INVOCATION_FAILED` for all symbols, including an invalid symbol. Because invalid symbols should fail before any issuer fetch, the likely cause was serverless module-load failure from importing the large frontend provider module into `api/etf-holdings.ts`.

Small fix applied:

- Kept the same whitelist, endpoint shape, and normalized response.
- Kept no-login, no-database, no-storage, no-scheduled-job behavior.
- Made the serverless route self-contained with server-safe parser logic.
- Improved 00981A error reporting so a Uni-President issuer/runtime failure does not block 0050 or 00994A.

## Manual Result Checklist

Record these fields for each supported route:

| Symbol | HTTP status | response `status` | constituent count | asOfDate | warnings | errors | Ready for UI integration |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `0050` | `200` | `ok` | `50` | `2026-05-22` | none | none | yes |
| `00646` | local handler test `200`; deployed pending | `partial` | `503` | `2026-05-22` | ignored futures/cash/margin rows | none | API only; UI update button not enabled |
| `00981A` | `502` | `failed` | `0` | none | none | `Uni-President 00981A official PCF fetch failed. fetch failed`; likely issuer/runtime network policy | no |
| `00994A` | `200` | `partial` | `40` | `2026-05-22` | skipped 2 invalid official `Get_hd` rows | none | yes for diagnostic UI; keep warnings visible |

Latest deployed test timestamp: `2026-05-22 17:23 Asia/Taipei`.

## If 00981A Fails

If `00981A` returns `failed` while `0050` and `00994A` succeed, treat it as an issuer/runtime compatibility issue for the Uni-President endpoint. Keep 0050 and 00994A eligible for later diagnostic UI work, and document the 00981A error message before changing request headers or body.

User portfolio, transaction, price, and manually imported ETF constituent data remain browser `localStorage` only. The proxy receives only the requested ETF symbol.

## Step 35 00981A Focus

Current automation priority is `0050` first and `00981A` second. `00994A` remains documented as available/partial, but it is now low priority / CSV fallback because it is no longer a current user holding.

For `00981A`, Step 35 added same-URL `307` cookie redirect handling and structured failure diagnostics. After deployment, retest:

`https://etf-lookthrough-analyzer.vercel.app/api/etf-holdings?symbol=00981A`

If it still fails, inspect the returned `debug.attempts` array and keep CSV fallback until a runtime that can satisfy the issuer's cookie challenge is chosen.

Latest Step 35 deployed test timestamp: `2026-05-22 17:33 Asia/Taipei`.

| Symbol | HTTP status | response `status` | constituent count | asOfDate | warnings | errors | Ready for UI integration |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `0050` | `200` | `ok` | `50` | `2026-05-22` | none | none | yes |
| `00981A` | `200` | `partial` | `48` | `2026-05-21` | skipped 5 invalid official PCF rows | none | yes for diagnostic UI; keep warnings visible |
| `00994A` | `200` | `partial` | `40` | `2026-05-22` | skipped 2 invalid official `Get_hd` rows | none | low priority only |

## Step 46 00646 Proxy Test

Step 46 adds official 00646 support to the same whitelisted API route:

`https://etf-lookthrough-analyzer.vercel.app/api/etf-holdings?symbol=00646`

Expected deployed result after Vercel finishes deployment:

- HTTP `200`
- response `status`: `ok` or `partial`
- `symbol`: `00646`
- constituent count around `503`
- every constituent should have `underlyingMarket: "US"`
- `source`: Yuanta 00646 official PCF/Daily JSON
- warnings may mention ignored futures / cash / margin rows
- `errors` should be empty

00646 is API-only in Step 46. Do not expect a 00646 update button in the UI yet, and do not include 00646 in one-click batch update until a later step.

Local serverless handler smoke test on `2026-05-25 Asia/Taipei`:

| Symbol | HTTP status | response `status` | constituent count | asOfDate | warnings | errors |
| --- | --- | --- | --- | --- | --- | --- |
| `00646` | `200` | `partial` | `503` | `2026-05-22` | ignored futures `1`, cash `5`, margin `2` | none |
| `0050` | `200` | `ok` | `50` | `2026-05-25` | none | none |
| `00981A` | `200` | `partial` | `48` | `2026-05-22` | skipped 5 invalid official PCF rows | none |
| `00994A` | `200` | `partial` | `40` | `2026-05-22` | skipped 2 invalid official `Get_hd` rows | none |
