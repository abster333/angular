# Proposed Changes Tracker — FINDING-SSRF-platform-server-v2

## Purpose
Track all proposed updates to the revised report, reconcile it with V-001 and the prior submission, and prepare a clear response to the dev-team questions.

## Working Agreement
- This is the single source of truth for next steps, ideas, and open questions.
- Update this doc at every step: add/remove items as decisions are made.
- Prefer explicit status tags over informal notes.

## Inputs
- Revised report: `BugBounty/Reports/FINDING-SSRF-platform-server-v2.md`
- Prior report: `BugBounty/Reports/FINDING-SSRF-platform-server.md`
- Vector reference: `BugBounty/TestedVectors.md` (V-001)
- Repros:
  - `BugBounty/Repros/ssrf-ssr-app`
  - `BugBounty/Repros/ssrf-stock-ngmodule`
- Angular-supplied code paths:
  - `node_modules/@schematics/angular/ssr/files/server-builder/server.ts.template`
  - `node_modules/@angular/ssr/fesm2022/node.mjs`
  - `packages/platform-server/src/location.ts`
  - `packages/platform-server/src/http.ts`

## Dev Team Questions (must answer explicitly)
1) How could this be exploited against other users?
2) Who controls those headers, and how?
3) What is the concrete security impact?
4) Can you demonstrate it on an Angular SSR app?

## Proposed Changes (initial list)
Status legend: [ ] planned, [~] in progress, [x] done

[x] Add a “Relationship to V-001” section explaining v2 as the concrete exploit path.
[x] Add a short data-flow chain linking:
    - Header-derived base URL (templates/adapter)
    - `INITIAL_CONFIG.url`
    - `ServerPlatformLocation`
    - `relativeUrlsTransformerInterceptorFn`
[x] Pull full repro commands into v2 (from the two repro READMEs).
[x] Add tested versions/environment (Angular version, @angular/ssr version, Node version).
[x] Add a concise attacker model section (how Host/Forwarded can be attacker-controlled).
[x] Add a concrete impact section with SSR HTML evidence (INTERNAL_SECRET_123).
[x] Add a “Why this is security-relevant default behavior” section (templates + adapter).
[x] Clarify severity rationale vs prior report (why Medium in v2).
[x] Optional: add a short “defense-in-depth” note about safe origin pinning.

## Next Steps Tracker (living)
Use this section to track every agreed action, even if small.

- [x] Draft “Relationship to V-001” section for v2.
- [x] Add data-flow chain paragraph with file refs.
- [x] Pull repro commands + expected output into v2.
- [x] Add tested versions/environment block.
- [x] Add attacker control + “against other users” framing.
- [x] Add concrete impact section tied to repro evidence.
- [x] Reconcile severity (Medium vs Medium–High) with rationale.
- [x] Add mitigation recommendations (concise, non-breaking).
- [x] Prep dev-team response (short answers to their 4 questions).
- [x] Save dev-team response draft to `BugBounty/Reports/Response/FINDING-SSRF-platform-server-v2-DEV-RESPONSE.md`.
- [x] Add an explicit attack‑scenario section (who/what/how impact) per Google guidance.
- [x] Add “quick reproduce” step list (minimal, copy‑pasteable).
- [x] Evaluate whether a minimal automated PoC is warranted (bash/node); decide and document.
- [x] Re‑check impact framing to avoid “request only” SSRF false positive.
- [x] Re‑evaluate severity with stronger impact evidence if available.
- [x] Create a standalone repro (npm packages; no Angular repo required).
- [x] Update the Google response draft to include standalone repro steps and file list.

## Ideas / Experiments to Consider
- [x] Decide if Docker repro is worth including or keep two minimal repros.
- [x] Add a one-paragraph note on proxy trust boundaries (`x-forwarded-*`).
- [x] Add a short “why this is Angular-supplied behavior” justification.

## Decisions Log
- 2025-12-30: Keep the report focused on the two minimal repros; exclude Docker repro for brevity.
- 2025-12-30: Proxy trust boundary is covered in the attacker-control section; no extra deep dive.
- 2025-12-30: “Security-relevant default behavior” section added to emphasize Angular-supplied scaffolding/adapter.
- 2025-12-30: Defense-in-depth covered via the safe override recommendation; no separate appendix.
- 2025-12-30: Automated PoC not added; quick repro steps are sufficient and already minimal.
- 2025-12-30: Added a standalone repro (npm packages) to enable running outside the Angular repo.

## Submission vs. Local v2 (comparison)
Submission (as sent)
- Summary: base URL derived from Host/X-Forwarded-*; relative SSR HttpClient can be steered.
- Code path bullets: CLI template, @angular/ssr adapter, platform-server location.ts, http.ts.
- Attack scenario: attacker who can influence Host / X-Forwarded-Host can steer SSR requests to internal hosts.

Local v2 report (current)
- Executive summary + conditional impact + preconditions.
- Evidence: CLI template, @angular/ssr adapter, stock ngmodule server example.
- Repros: minimal SSR app + stock ngmodule SSR example (commands + expected marker).
- Root cause, severity, recommendations.

Gaps in submission vs local v2
- Missing concrete repro commands + expected output (INTERNAL_SECRET_123).
- Missing tested versions/environment and scope.
- Missing explicit “evidence” section with file paths and snippets.
- Missing severity rationale and mitigation recommendations.

Gaps in local v2 vs submission (to add for clarity)
- Explicit “attacker control of Host/X-Forwarded-*” paragraph (direct requests or misconfigured proxy).
- Explicit “exploit against other users” framing (multi-tenant SSR or shared SSR origin).
- Explicit relationship to V-001 (v2 as concrete exploit path of the core platform-server issue).

Overlap (consistent points)
- Header-derived base URL is the source of control.
- Relative SSR HttpClient resolution is the exploit mechanism.
- Angular-supplied templates/adapter are the default sources.

## Response Draft Notes (dev team reply)
- Attacker control: Host or X-Forwarded-* can be controlled directly (when no proxy) or via misconfigured/over-trusting proxy; SSR servers commonly trust these headers for URL construction.
- Exploitability: any SSR route that issues relative HttpClient calls during render can be steered; response is rendered into HTML.
- Impact: internal services (127.0.0.1/10.x/169.254.169.254) reachable; can leak data into SSR HTML; timing side channels possible.
- Demonstration: include `ssrf-ssr-app` and stock ngmodule repro (commands + expected output).

## Order of Operations (agreed)
1) Create this proposed-changes doc (done).
2) Compare submission vs local v2 report.
3) Evaluate dev team response (identify missing clarity).
4) Update proposed changes to reflect gaps.
5) Apply edits to v2 report.

## Open Questions
- Should v2 explicitly reference the earlier report or treat this as standalone?
- Include Docker repro or keep minimal two repros?
