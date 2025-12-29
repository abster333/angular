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

## Preconditions (all required)
1) SSR app performs **relative** `HttpClient` requests during SSR  
2) SSR base URL is derived from request headers (Host/Forwarded)  
3) Attacker can influence those headers (directly or via misconfigured proxies)  
4) SSR response or timing is observable by the attacker  

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

## Repro Evidence (local, controlled)

### A) Minimal SSR app repro
**Location:** `BugBounty/Repros/ssrf-ssr-app`  
**What it shows:** Host‑header‑derived SSR base causes SSR `HttpClient.get('/secret')` to resolve to attacker‑chosen internal host.

**Exploit demo:**
```bash
curl -H 'Host: 127.0.0.1:4401' http://127.0.0.1:4400/
```
**Expected result:** SSR HTML contains `INTERNAL_SECRET_123`.

### B) Stock ngmodule SSR example repro
**Location:** `BugBounty/Repros/ssrf-stock-ngmodule`  
**What it shows:** Angular’s own ngmodule SSR example is exploitable with Host header + relative SSR fetch (`/api-2`).

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

Escalate only with evidence of high‑value data exposure in a real deployment.

---

## Recommendations (practical and non‑breaking)
1) **Update Angular‑supplied templates** to avoid `headers.host` by default.  
   Use a **trusted origin** (env/allowlist) or a new token (e.g., `SERVER_URL`) that pins SSR base URL.
2) **Document the trust boundary**: Host and Forwarded headers are untrusted unless explicitly validated.  
3) **Provide a safe override** in SSR adapter (`@angular/ssr/node`) to pin the request origin if configured.

---

## Conclusion
This is a **real SSRF risk** in production‑relevant Angular SSR flows **when common app patterns are present**. The strongest evidence is that **Angular ships templates and adapter behavior that derive the SSR base URL from request headers** without guardrails, and that Angular’s own ngmodule example is exploitable in practice.
