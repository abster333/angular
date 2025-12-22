# Scope: Angular Security Audit

The scope for the Angular bug bounty program is defined by the Google OSS VRP rules, focusing on the core framework and its ecosystem.

## In-Scope Assets
- **Core Repositories:**
  - `angular/angular` (The main framework)
  - `angular/angular-cli` (Command line interface)
  - `angular/components` (Material & CDK)
  - Other core repositories under the `angular` GitHub organization.
- **Repository Configuration:**
  - GitHub Actions workflows (`.github/workflows/`).
  - Branch protection rules and access control.
  - CI/CD pipeline configurations (Bazel, CircleCI, etc.).
- **Third-Party Dependencies:**
  - Vulnerabilities in dependencies that are exploitable through Angular's usage.

## Qualifying Vulnerabilities
- **Product Vulnerabilities:**
  - Cross-Site Scripting (XSS) in the framework's sanitization or rendering engine.
  - Server-Side Request Forgery (SSRF) in Angular SSR.
  - Cross-Site Request Forgery (CSRF) protection bypasses in `HttpClient`.
  - Path Traversal in CLI or build tools.
  - Insecure defaults or documentation examples.
- **Supply Chain Compromises:**
  - Ability to modify code on `main` or release branches.
  - Disclosure of secrets (signing keys, NPM tokens) in CI logs or public files.

## Out-of-Scope
- **Third-Party Platforms:** Vulnerabilities in GitHub, NPM, or Google Cloud Platform itself (unless it's a misconfiguration by the Angular team).
- **Downstream Integrations:** Vulnerabilities caused by insecure *usage* of Angular by developers (e.g., explicitly bypassing security with `DomSanitizer`).
- **Non-Technical Issues:** Social engineering, physical security, or DoS attacks against infrastructure.

## Rules of Engagement
- **Safe Testing:** Perform testing locally whenever possible. Do not disrupt the service for other users.
- **No Disruption:** Do not attempt Denial of Service (DoS) or spamming.
- **Data Privacy:** Do not access or modify data that does not belong to you.
- **Upstream First:** For dependency vulnerabilities, report to the upstream maintainer first. Wait 30 days after a fix is released before reporting to Google OSS VRP.
