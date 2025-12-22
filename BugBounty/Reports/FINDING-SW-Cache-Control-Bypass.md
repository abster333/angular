# [Service Worker] DataGroup Caching ignores Cache-Control: no-store

**ID:** V-002
**Date:** 2025-12-22
**Severity:** Medium/High
**Component:** `@angular/service-worker`
**File:** `packages/service-worker/worker/src/data.ts`

## Summary
The Angular Service Worker's `DataGroup` caching mechanism ignores standard HTTP caching headers, specifically `Cache-Control: no-store`. When a developer configures a `DataGroup` with a broad pattern (e.g., `/api/**`) using the `performance` strategy, the Service Worker will cache and serve responses even if the server explicitly forbids caching. This can lead to the caching of sensitive data (PII) or security tokens that should never be persisted on the client.

## Vulnerability Details
In `packages/service-worker/worker/src/data.ts`, the `cacheResponse` method is responsible for storing responses in the cache. It checks if the response is successful (`res.ok`) or opaque (if allowed), but it **does not** check for `Cache-Control` headers.

```typescript
// packages/service-worker/worker/src/data.ts

private async cacheResponse(
  req: Request,
  res: Response,
  lru: LruList,
  okToCacheOpaque = false,
): Promise<void> {
  // Only cache successful responses.
  if (!(res.ok || (okToCacheOpaque && res.type === 'opaque'))) {
    return;
  }
  
  // ... (caching logic proceeds without checking headers)
```

Consequently, if a `DataGroup` is configured to match a URL, the Service Worker will cache it regardless of what the server says.

## Reproduction Steps
1.  **Setup**: Create a new test file `packages/service-worker/worker/test/data_security_spec.ts`.
2.  **Configuration**: Define a `DataGroup` with the `performance` strategy matching `/api/**`.
3.  **Mock Server**: Mock a server response for `/api/sensitive` that includes the header `Cache-Control: no-store`.
4.  **Execution**:
    - Make a request to `/api/sensitive`.
    - Update the mock server content (to prove we aren't hitting it again).
    - Make a second request to `/api/sensitive`.
5.  **Observation**: The second request returns the *original* cached data, and the server sees no second request.

**Reproduction Command:**
```bash
pnpm test //packages/service-worker/worker/test:test
```

## Impact
- **Persistent Sessions**: Endpoints like `/api/logout` might be cached. If a user logs out, the SW might still serve a "success" response from the cache, or worse, serve a cached "logged in" state for `/api/user` after logout.
- **Data Leakage**: Sensitive PII (Personally Identifiable Information) served with `no-store` (e.g., on a shared computer) will be persisted in the browser's Cache Storage, accessible to anyone with access to the device's developer tools or file system.
- **Stale Security Tokens**: CSRF tokens or short-lived authentication tokens might be cached and reused after expiration.

## Proposed Fix
Modify `cacheResponse` in `packages/service-worker/worker/src/data.ts` to respect `Cache-Control` headers.

```typescript
private async cacheResponse(
  req: Request,
  res: Response,
  lru: LruList,
  okToCacheOpaque = false,
): Promise<void> {
  // Check for no-store header
  const cacheControl = res.headers.get('Cache-Control');
  if (cacheControl && cacheControl.includes('no-store')) {
    return;
  }

  // Only cache successful responses.
  if (!(res.ok || (okToCacheOpaque && res.type === 'opaque'))) {
    return;
  }
  // ...
```

Additionally, consider adding an `exclude` pattern to `DataGroupConfig` to allow developers to explicitly exempt sensitive paths from broad wildcard patterns.
