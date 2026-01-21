Subject: Angular SSR Host header controls SSR HttpClient base (fresh ng new --ssr repro attached)

Hi Google Bug Hunter Team,

Thanks — per your request, I’m providing a repro based on a freshly generated `ng new --ssr` project (latest CLI), with only minimal changes required to *demonstrate* the impact. I will attach the project as a zip so you can verify without recreating anything.

## What I’m providing

- Attachment: `ssr-hostheader-poc.zip`
  - Generated with latest CLI via: `npx -y @angular/cli@latest new ssr-hostheader-poc --ssr --skip-git --skip-install`
  - Then: `npm install` (lockfile included), plus the minimal changes listed below.
  - The generated SSR server entry `src/server.ts` is **unchanged** (this is the behavior under test).

## How to run the attached repro

1) Install deps:
   - `cd ssr-hostheader-poc && npm install`

2) Start the “internal” API (simulates a loopback-only/internal service):
   - `node internal-api/server.mjs` (listens on `127.0.0.1:4401`, returns `INTERNAL_SECRET_123` at `/secret`)

3) Build and run the generated SSR server bundle:
   - `npm run build`
   - `npm run serve:ssr:ssr-hostheader-poc` (listens on `127.0.0.1:4000`)

4) Send the attacker request with a crafted `Host`:
   - `curl -H 'Host: 127.0.0.1:4401' http://127.0.0.1:4000/`

Expected: the SSR HTML response contains `INTERNAL_SECRET_123` (i.e., internal data is fetched server-side and rendered into HTML visible to the requester).

Observed output (example)
- In SSR HTML:
  - `<pre>INTERNAL_SECRET_123</pre>`
- Also present in the TransferState payload:
  - `<script id="ng-state" type="application/json">… "u":"/secret" … "b":"INTERNAL_SECRET_123" …</script>`

## Minimal changes (and why they do NOT “create the vulnerability”)

1) Add a relative SSR HttpClient call and render it (to make the impact observable in HTML):
   - `src/app/app.ts` / `src/app/app.html` (+ `provideHttpClient(withFetch())` in `src/app/app.config.ts`)
   - This is representative of common SSR data-fetch patterns (relative URLs).

2) One-line change to ensure SSR runs at request time (not build-time prerender):
   - `src/app/app.routes.server.ts`: `RenderMode.Prerender` → `RenderMode.Server`
   - This does **not** introduce the Host-header trust behavior. It only avoids build-time prerender (which has no incoming attacker request context), so the SSR pipeline runs per HTTP request and can be influenced by the request headers as in real deployments.

The issue itself is that the SSR “base URL” used by platform-server/HttpClient is derived from request headers (e.g. `Host` / `X-Forwarded-*`) without validation/allow-listing, allowing relative SSR HttpClient requests to be steered to unintended hosts.

## Where the Host-derived SSR URL comes from (template paths)

Angular CLI SSR templates that construct the SSR URL from request headers:
- Angular CLI repo paths:
  - `packages/schematics/angular/ssr/files/server-builder/server.ts.template`
  - `packages/schematics/angular/ssr/files/application-builder/server.ts.template`
- Published `@schematics/angular` package paths:
  - `@schematics/angular/ssr/files/server-builder/server.ts.template`
  - `@schematics/angular/ssr/files/application-builder/server.ts.template`

In the attached project, the generated `src/server.ts` is produced from that template and is left unchanged.

If you’d like, I can also include the exact CLI command output / versions used to generate the attached project, but I’ve kept this update focused on reproducibility and verification.

Best,
