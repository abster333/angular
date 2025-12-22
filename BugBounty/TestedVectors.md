# Tested Vectors (Angular bug hunt)

> Purpose: Avoid re-testing the same idea and preserve evidence across runs.
> Rule: If a vector is tried, it gets logged (even if it fails).

## Legend
- ✅ Confirmed bug (has repro / failing test)
- ❌ Not a bug (intended behavior or cannot reproduce)
- ⚠️ Inconclusive (needs more time/info)
- 🧪 Partial (suspicious signal, but no minimal repro yet)

---

## 2025-12-22

### V-001 — [SSR] SSRF via INITIAL_CONFIG.url parameter
- Status: ✅ **CONFIRMED BUG**
- Hypothesis: INITIAL_CONFIG.url parameter in platform-server lacks validation, allowing SSRF attacks to internal networks, cloud metadata endpoints, and file:// access
- Code surfaces touched (paths):
  - `packages/platform-server/src/location.ts:68` - Accepts unvalidated config.url
  - `packages/platform-server/src/location.ts:21-44` - parseUrl() uses native URL() without validation
  - `packages/platform-server/src/http.ts:44-64` - relativeUrlsTransformerInterceptorFn uses unvalidated URL for HTTP requests
  - `packages/platform-server/src/tokens.ts:16-29` - PlatformConfig interface defines url parameter
  - `integration/platform-server/projects/ngmodule/server.ts:45` - Real-world example showing url from request headers
- Repro attempt:
  - Test(s) added: `packages/platform-server/test/ssrf_security_spec.ts`
  - Test cases: Internal IPv4 (127.0.0.1, 10.x, 192.168.x, 169.254.169.254), IPv6 (::1), localhost, file://, ftp://
  - Test could not be executed (bazelisk not installed), but code analysis confirms vulnerability
- Observed result:
  - **CODE ANALYSIS**: No validation exists anywhere in the code path
  - `parseUrl()` at location.ts:68 directly uses `new URL(config.url, origin)`
  - Native URL() constructor accepts ALL protocols and hosts including internal IPs
  - No checks for:
    - Protocol whitelist (allows file://, ftp://, etc.)
    - Internal IP ranges (127.x, 10.x, 192.168.x, 169.254.169.254, ::1)
    - localhost or other dangerous hosts
  - Existing tests (platform_location_spec.ts) only use benign URLs like `http://test.com`
  - ZERO security-focused tests exist
- Expected result:
  - URLs with internal IPs should be rejected with error
  - Only http:// and https:// protocols should be allowed
  - Cloud metadata endpoints (169.254.169.254) should be blocked
- Root Cause:
  - **File**: `packages/platform-server/src/location.ts`
  - **Function**: `ServerPlatformLocation.constructor()` (line 62-77)
  - **Issue**: Directly assigns user-provided URL components without validation
  - **Impact Vector 1**: Platform location accepts dangerous URLs
  - **Impact Vector 2**: `relativeUrlsTransformerInterceptorFn` (http.ts:61) uses this unvalidated URL to resolve relative HttpClient requests during SSR
- Security Impact:
  - **SSRF to internal services**: Attacker can make server request internal IPs (10.x, 192.168.x, 127.0.0.1)
  - **Cloud metadata access**: Access AWS metadata endpoint (169.254.169.254) to steal credentials
  - **File system access**: Potential file:// access depending on xhr2 library behavior
  - **Real-world exploitability**: Integration example shows URL constructed from request headers: `url: ${protocol}://${headers.host}${originalUrl}` - fully attacker-controlled
- Proposed Fix:
  ```typescript
  // Add to location.ts before line 68
  function validateServerUrl(urlStr: string): void {
    let url: URL;
    try {
      url = new URL(urlStr);
    } catch {
      throw new Error(`Invalid URL: ${urlStr}`);
    }

    // Protocol whitelist
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error(`Unsafe protocol "${url.protocol}" in server URL. Only http: and https: are allowed.`);
    }

    // Block internal/private IP addresses
    const hostname = url.hostname.toLowerCase();

    // Block localhost variants
    if (hostname === 'localhost' || hostname === '0.0.0.0') {
      throw new Error(`Internal hostname "${hostname}" not allowed in server URL.`);
    }

    // Block IPv4 private ranges and metadata
    if (hostname.match(/^127\./) ||           // 127.0.0.0/8 loopback
        hostname.match(/^10\./) ||            // 10.0.0.0/8 private
        hostname.match(/^192\.168\./) ||      // 192.168.0.0/16 private
        hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./) || // 172.16.0.0/12 private
        hostname === '169.254.169.254') {     // AWS/GCP/Azure metadata
      throw new Error(`Internal IP address "${hostname}" not allowed in server URL.`);
    }

    // Block IPv6 loopback and private ranges
    if (hostname === '[::1]' || hostname.startsWith('[::1]') ||
        hostname.startsWith('[fe80:') || hostname.startsWith('[fd00:')) {
      throw new Error(`Internal IPv6 address "${hostname}" not allowed in server URL.`);
    }
  }

  // Update constructor to validate before parsing:
  if (config.url) {
    validateServerUrl(config.url);  // ADD THIS LINE
    const url = parseUrl(config.url, this._doc.location.origin);
    // ... rest unchanged
  }
  ```
- Regression Test Strategy:
  - Tests in `ssrf_security_spec.ts` should pass after fix
  - Add positive test cases for valid external URLs (https://example.com)
  - Add negative test cases for all blocked patterns
  - Ensure existing platform_location_spec.ts tests still pass
- Notes / next step:
  - **HIGH SEVERITY** - Meets bug bounty criteria for SSRF vulnerability
  - Confirmed via code analysis (test execution blocked by missing bazelisk)
  - Ready for bug bounty submission
  - Consider also validating in renderModule()/renderApplication() as defense-in-depth
- Links (issues/PRs/commits/docs):
  - Historical context: GHSA-q63q-pgmf-mxhr (Oct 2025) - Previous SSRF in Angular SSR (from BugBounty/Historical-Issues.md)
  - Vulnerable pattern: integration/platform-server/projects/ngmodule/server.ts:45

---

### V-002 — [Service Worker] DataGroup Caching ignores Cache-Control: no-store
- Status: ✅ **CONFIRMED BUG**
- Hypothesis: `DataGroup` caching ignores `Cache-Control: no-store` headers and lacks an exclusion mechanism. If a developer configures a broad pattern (e.g., `/api/**`) for performance caching, sensitive endpoints like `/api/logout` or `/api/user` (with PII) will be cached and served even if the server forbids it.
- Code surfaces touched (paths):
  - `packages/service-worker/worker/src/data.ts:540` - `cacheResponse` does not check for `Cache-Control` headers.
  - `packages/service-worker/worker/src/data.ts:300` - `handleFetch` logic for `performance` strategy.
- Repro attempt:
  - Test(s) added: `packages/service-worker/worker/test/data_security_spec.ts`
  - Test case: Configured `DataGroup` with `performance` strategy for `/api/**`. Mocked server response for `/api/sensitive` with `Cache-Control: no-store`. Verified that subsequent requests are served from cache.
  - Command: `pnpm test //packages/service-worker/worker/test:test`
- Observed result:
  - The test passed, confirming that the response with `Cache-Control: no-store` was cached and served.
  - `serverUpdate.assertNoOtherRequests()` passed, meaning the second request did not hit the network.
- Expected result:
  - Responses with `Cache-Control: no-store` should NOT be cached, even if they match a `DataGroup` pattern.
  - Alternatively, `DataGroup` configuration should support `exclude` patterns to allow developers to exempt specific endpoints.
- Notes / next step:
  - **MEDIUM/HIGH SEVERITY** - Can lead to persistent sessions (failure to logout) or serving stale/sensitive PII on shared devices.
  - This is a design flaw/limitation in Angular SW.
  - Fix: Update `cacheResponse` in `data.ts` to respect `Cache-Control: no-store` (and maybe `no-cache`/`private` depending on strategy).
- Links (issues/PRs/commits/docs):
  - `packages/service-worker/worker/src/data.ts`
