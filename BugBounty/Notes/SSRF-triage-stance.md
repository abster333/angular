# SSRF Triage Stance (Platform-Server)

Date: 2025-12-22
Report: BugBounty/Reports/FINDING-SSRF-platform-server.md (V-001)

## Current stance (skeptical)
Verdict: **EXPLOITABLE-HIGH** (confidence ~0.73)

Reasoning summary:
- We have **PoC-style tests** showing current behavior: internal base URLs are accepted and relative HttpClient requests resolve against that base.
- We do **not** yet have an end-to-end SSR repro that demonstrates observable data exfiltration.
- Exploitability depends on app-level configuration patterns that are common but not guaranteed.

## Evidence we have
1) Code path accepts arbitrary URL bases
- packages/platform-server/src/location.ts (ServerPlatformLocation uses URL() without validation)

2) PoC-style tests (current behavior)
- packages/platform-server/test/ssrf_security_spec.ts
- Command: `corepack pnpm test //packages/platform-server/test:test --test_arg=--filter=SSRF`
- Result: PASS (demonstrates acceptance of internal URLs and resolution of relative HttpClient requests to internal bases)

3) End-to-end SSR repro (Host header → internal fetch → HTML)
- BugBounty/Repros/ssrf-ssr-app
- Command: `corepack pnpm ts-node --transpile-only --project BugBounty/Repros/ssrf-ssr-app/tsconfig.json BugBounty/Repros/ssrf-ssr-app/server.ts`
- Exploit: `curl -H 'Host: 127.0.0.1:4401' http://127.0.0.1:4400/`
- Result: HTML contains `<div id="secret">INTERNAL_SECRET_123</div>`

4) Risky app pattern exists in repo example
- integration/platform-server/projects/ngmodule/server.ts (constructs url from request headers)

## Assumptions required for exploitation (with labels)
1) App passes untrusted request data into INITIAL_CONFIG.url (e.g., Host header)
- Label: depends on config

2) SSR code issues relative HttpClient requests during render
- Label: depends on config

3) SSR response is observable by attacker (HTML body, timing, logs)
- Label: depends on config

4) Target internal/metadata endpoints reachable from SSR host network
- Label: depends on deployment

5) IMDSv2 / metadata protections can be bypassed or are not enforced
- Label: depends on config

## Likelihood × Impact (triage view)
- Likelihood: Medium (requires specific app patterns)
- Impact: High (if data exfiltration succeeds)
- Combined: EXPLOITABLE-MED (pending end-to-end repro)

## What changed our mind
**Single missing datapoint (now satisfied):**
A minimal SSR app repro that shows an actual SSR-time HTTP fetch to an internal endpoint and renders the response in HTML.

Observed via the repro in `BugBounty/Repros/ssrf-ssr-app`, which returns the marker `INTERNAL_SECRET_123` in the SSR HTML when the Host header is set to the internal server.

## Minimal SSR app repro (checklist)
Goal: demonstrate observable SSR-time data exfiltration driven by Host header or other untrusted input.

[Approach note]\nWe will base the repro on an **official Angular SSR example** (repo integration example or Angular SSR template) with minimal changes. This avoids a contrived environment while keeping the proof repeatable and within scope. We will **not** test live third‑party deployments without explicit permission.

[x] Build a tiny SSR app that:
    [x] reads request Host (or similar untrusted input)
    [x] passes it into INITIAL_CONFIG.url
    [x] makes an HttpClient GET to a relative path during SSR
    [x] renders the response into HTML

[x] Replace the internal target with a mock service:
    [x] local HTTP server bound to 127.0.0.1 or 169.254.169.254 substitute
    [x] endpoint returns known marker value

[x] Make a request with crafted Host header
    [x] confirm SSR resolves HttpClient request to the internal base
    [x] confirm marker value appears in rendered HTML

[x] Record outputs
    [x] HTTP request/response transcript
    [x] server logs showing internal request

## Confidence-improvement plan (checklist)
Goal: raise confidence by demonstrating exploitability in standard Angular SSR patterns with strong evidence.

[x] Exploit a stock Angular SSR example (minimal changes)
    [x] Use `integration/platform-server/projects/ngmodule` or official SSR template
    [x] Add one relative HttpClient call during SSR (minimal, documented change)
    [x] Repro Host-header-driven internal fetch in that example

[x] Capture network-level evidence of internal fetch
    [x] Internal mock server logs with timestamps + request path
    [x] SSR server logs showing Host-derived base URL

[x] Remove "dev environment" doubts
    [x] Run via build artifacts / standard Angular SSR build pipeline (not ts-node)
    [x] Record exact build/run commands

[x] Demonstrate Host header realism
    [x] Show default/standard SSR server uses `req.headers.host` (or equivalent)
    [x] Note any default proxy behavior (X-Forwarded-Host, etc.)

[ ] Future (optional): real deployment evidence
    [ ] Only test deployments you own or have explicit permission to assess
    [ ] Document scope/authorization and capture evidence safely

## Containerized production-style repro (checklist)
Goal: Prove the SSRF vulnerability persists in a production build running inside a containerized environment, mimicking a cloud deployment.

[ ] Phase 1: Preparation (The "Victim")
    [x] Create Dockerfile under `BugBounty/Repros/` (keep repo clean)
    [x] Build Angular app in production mode (AOT, optimizations)
    [x] If no prod target exists, document fallback to dev build explicitly (N/A; prod build used)
    [x] Expose SSR server port and run built artifact
    [x] Build Docker image (`ssrf-ngmodule-prod` built)

[ ] Phase 2: Infrastructure (The "Internal Network")
    [x] Ensure mock internal service (`BugBounty/Repros/ssrf-stock-ngmodule/internal-api.js`) is ready
    [x] Prefer internal service container on same Docker network (avoid host.docker.internal)

[ ] Phase 3: Execution (The "Exploit")
    [x] Build and run Docker container
    [x] Send request with malicious Host header (`Host: internal-api:4401`)
    [x] Verify HTML response contains secret data
    [x] Record image tag and compose file hash for reproducibility (image: `ssrf-ngmodule-prod:latest`, digest: `sha256:a69ad329693d273bb0705a90403ad2ca16043c03657ef5c1230203e2ecc9893d`, compose: N/A)

[ ] Phase 4: Remediation Verification
    [x] Apply fix to `packages/platform-server`
    [x] Rebuild Docker image with patched code
    [x] Confirm attack is blocked (response shows `API 2 response`, no `INTERNAL_SECRET_123`)

## Decision criteria
- If SSR response contains internal data controlled by attacker input: **confirm exploitability**.
- If SSR refuses internal URL or does not perform relative requests: **downgrade**.
- If SSR does relative requests but response is not observable: **lower severity**.
