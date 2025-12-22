# Historical Security Context

Understanding past vulnerabilities helps identify recurring patterns and weak spots in the architecture.

## Recent Security Advisories

| ID | Date | Title | Severity | Area | Root Cause Summary |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **GHSA-v4hv-rgfq-gp49** | Dec 2025 | Stored XSS via SVG/MathML | High | Sanitizer | Failure to sanitize specific SVG animation and MathML attributes. |
| **GHSA-58c5-g7wp-6w37** | Nov 2025 | XSRF Token Leakage | High | HttpClient | Protocol-relative URLs caused tokens to be sent to unintended origins. |
| **GHSA-q63q-pgmf-mxhr** | Oct 2025 | SSRF in Angular SSR | High | SSR | Insecure handling of URLs in server-side rendering context. |
| **GHSA-68x2-mx4q-78m7** | Sep 2025 | SSR Race Condition | High | SSR | Global platform injector race condition leading to cross-request data leakage. |

## Recurring Themes & Attack Surfaces

### 1. XSS in Sanitization (DomSanitizer)
Angular's primary defense against XSS is its built-in sanitizer. However, new browser features (like MathML or complex SVG attributes) often introduce bypasses.
- **Focus:** `packages/core/src/sanitization/` and `packages/platform-browser/src/security/`.

### 2. Server-Side Rendering (SSR) Complexity
The transition from client-side to server-side rendering introduces new risks, particularly around state isolation and request handling.
- **Focus:** `@angular/ssr` and race conditions in singleton services used during SSR.

### 3. HttpClient Security
Bypasses in XSRF/CSRF protection or unintended token leakage remain a recurring issue, especially when dealing with complex URL patterns.
- **Focus:** `packages/common/http/`.

### 4. Template Injection
While AOT prevents most template injection, dynamic component loading or JIT mode (if used) can still be vulnerable if user input is improperly handled.
- **Focus:** `packages/compiler/` and `packages/compiler-cli/`.
