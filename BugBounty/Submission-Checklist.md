# Submission Checklist

To ensure your report is processed efficiently and qualifies for the maximum possible reward, follow this checklist.

## 1. Impact Statement
- [ ] Clearly describe the security impact.
- [ ] Identify the affected user group (e.g., developers using the CLI, end-users of Angular apps).
- [ ] Explain the "worst-case scenario" (e.g., Full RCE on build server, Stored XSS on all sites using a specific component).

## 2. Reproduction Steps
- [ ] Provide a step-by-step guide to reproduce the issue.
- [ ] Include a **Minimal Reproducible Example (PoC)**.
- [ ] Specify the environment (OS, Node.js version, Angular version).
- [ ] If applicable, provide a link to a GitHub repository or StackBlitz demonstrating the vuln.

## 3. Technical Details
- [ ] Identify the exact file and line numbers in the source code.
- [ ] Explain the root cause (e.g., "Regex in sanitizer fails to account for MathML attributes").
- [ ] List affected versions and commits.

## 4. Exploitability
- [ ] Demonstrate that the vulnerability is exploitable in a real-world scenario.
- [ ] For supply chain issues, show how a non-maintainer could trigger the flaw.

## 5. Suggested Fix
- [ ] Provide a recommendation for remediation.
- [ ] If possible, include a code snippet or a link to a draft PR.

## Minimum Bar for Acceptance
Reports that do not meet the following criteria may be rejected or closed as "Informational":
- **Must be a technical security vulnerability.** (General bugs or feature requests belong in GitHub Issues).
- **Must include a clear reproduction.**
- **Must demonstrate security impact.** (e.g., "An attacker can execute X" rather than "This code looks weird").
