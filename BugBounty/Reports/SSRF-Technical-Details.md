# Technical Details: SSRF via Host/Forwarded‑Derived SSR Base URL

## Summary (what the reviewer needs to know)
Angular SSR builds a **base URL** for server‑side rendering from incoming request headers (`Host`, `X‑Forwarded‑Host`, `X‑Forwarded‑Proto`). Angular then resolves **relative** `HttpClient` requests against that base during SSR. If those headers are attacker‑controlled, the SSR base origin becomes attacker‑controlled, and SSR `HttpClient` requests can be steered to internal or attacker‑chosen hosts. This behavior is present in **Angular‑supplied server templates** and the **Node SSR adapter**, not just in user code.

---

## Where the behavior comes from (code paths)

### 1) CLI server template (server‑builder)
**File:** `node_modules/@schematics/angular/ssr/files/server-builder/server.ts.template`  
**Behavior:** Constructs SSR URL from `headers.host`
```ts
const { protocol, originalUrl, baseUrl, headers } = req;
url: `${protocol}://${headers.host}${originalUrl}`,
```
This is Angular‑generated server code used in production when the server‑builder path is chosen.

### 2) Node SSR adapter (application‑builder)
**File:** `node_modules/@angular/ssr/fesm2022/node.mjs`  
**Function:** `createRequestUrl(nodeRequest)`  
**Behavior:** Uses `X‑Forwarded‑Host` / `Host` to build a URL
```js
const protocol = getFirstHeaderValue(headers['x-forwarded-proto']) ?? ...;
const hostname = getFirstHeaderValue(headers['x-forwarded-host']) ?? headers.host ?? headers[':authority'];
return new URL(`${protocol}://${hostnameWithPort}${originalUrl ?? url}`);
```
This adapter is used by the newer application‑builder path and still derives the base URL from headers.

### 3) platform‑server uses the base URL without validation
**File:** `packages/platform-server/src/location.ts`  
**Behavior:** Accepts `INITIAL_CONFIG.url` and assigns protocol/hostname/port directly.

### 4) Relative SSR HttpClient requests resolve against that base
**File:** `packages/platform-server/src/http.ts`  
**Behavior:** `relativeUrlsTransformerInterceptorFn` resolves relative URLs using the base origin from `PlatformLocation`.

---

## Preconditions (all required)
1) App performs **relative** `HttpClient` requests during SSR (e.g., `http.get('/api/data')`).  
2) SSR base URL is derived from request headers (Host/Forwarded).  
3) Attacker can influence those headers (directly or via proxy misconfig).  
4) SSR response or timing is observable to the attacker.

---

## Evidence (local, controlled)

### A) Minimal SSR app repro
**Location:** `BugBounty/Repros/ssrf-ssr-app`  
**Exploit:**
```bash
curl -H 'Host: 127.0.0.1:4401' http://127.0.0.1:4400/
```
**Result:** SSR HTML contains `INTERNAL_SECRET_123`, showing a relative SSR `HttpClient` request was resolved against the Host‑derived internal base.

### B) Stock ngmodule SSR example repro
**Location:** `BugBounty/Repros/ssrf-stock-ngmodule`  
**Exploit:**
```bash
curl -H 'Host: 127.0.0.1:4401' http://127.0.0.1:4206/http-transferstate-lazy
```
**Result:** SSR HTML contains `INTERNAL_SECRET_123`, showing the **Angular‑supplied** ngmodule SSR example is exploitable without code changes.

---

## What this is (and is not)
- **Is:** A security issue in **Angular‑supplied SSR scaffolding and adapter defaults** that derive SSR base URL from untrusted headers.  
- **Is not:** A claim that Angular auto‑fetches data. SSR `HttpClient` calls are app‑initiated; the issue is the **base URL trust boundary**.

---

## Reviewer FAQs (pre‑emptive answers)

**Q: Isn’t this just app misuse?**  
**A:** The unsafe pattern is present in **Angular‑generated server templates** and the **Angular SSR adapter**, so it is an Angular‑supplied default, not purely user code.

**Q: Why is Host/Forwarded untrusted?**  
**A:** These headers are attacker‑controlled unless a trusted proxy sanitizes them. Many deployments do not enforce strict allowlists.

**Q: Does Angular “automatically” make network calls?**  
**A:** No. The SSR app makes `HttpClient` calls; the issue is that **relative** requests are resolved against an attacker‑controlled base URL.

**Q: Why is this SSRF and not just “bad URL parsing”?**  
**A:** `URL()` parsing is not the bug. The bug is the **trust boundary**: Host‑derived base origin + relative SSR fetches.

**Q: Is this exploitable in production?**  
**A:** Yes, when the preconditions are met. The stock ngmodule SSR example demonstrates Host‑header‑driven data exposure without code changes.

**Q: What about dev server changes in v17+?**  
**A:** The note about `server.ts` not being used by `ng serve` only affects dev. Production SSR still uses the generated server/adapter path.

---

## Recommended direction (non‑breaking)
1) Update Angular‑supplied SSR templates to **avoid `headers.host` by default**.  
2) Add docs that **Host/Forwarded must be allowlisted**.  
3) Provide a **safe override** in the SSR adapter to pin a trusted base origin.
