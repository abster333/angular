# V-002 — [Service Worker] `ngsw-config.json` glob patterns are regex-like (metacharacters not auto-escaped)

## 1) Summary

**Component:** `@angular/service-worker` config processing (`packages/service-worker/config/...`)

**Observed behavior:** The glob patterns in `ngsw-config.json` are converted into JavaScript regular expressions via `globToRegex()` (`packages/service-worker/config/src/glob.ts`). During this conversion, several RegExp metacharacters are not automatically escaped. This means patterns are effectively **glob-with-regex-features**, not “strict literal glob”.

**This appears to be documented/intentional:**
Angular’s own docs explicitly warn that “some characters with a special meaning in a regular expression are not escaped” and that patterns may need to be escaped manually. (See `adev/src/content/ecosystem/service-workers/config.md`.)

**Practical implication:** Developers who intend to match a literal filename that contains regex metacharacters (e.g. `(`, `)`, `|`, `$`, etc.) must escape them themselves in `ngsw-config.json`. Otherwise, include/exclude rules can behave unexpectedly.

## 2) Example: exclusion “bypass” is actually a missing escape

If a developer wants to exclude the literal file `/assets/secret(1).txt`:

- **Incorrect (unescaped):** `"!/assets/secret(1).txt"`
  - Interprets `(1)` as a regex capturing group and will not match the literal parentheses.

- **Correct (escaped):** `"!/assets/secret\\(1\\).txt"`
  - Note: In JSON, backslashes must be escaped, hence `\\(` and `\\)`.

So the failure mode is a **configuration footgun**: a literal filename may not match unless escaped.

## 3) Evidence this is relied upon “in the wild”

Many real `ngsw-config.json` files intentionally use regex operators like grouping/alternation, e.g.:

- `!/**/(version|issue-helper)/**` (uses `(...)` and `|` to match either path segment)
- `/*.(svg|cur|jpg|jpeg|png|...)` (uses alternation to match multiple extensions)

This strongly suggests that auto-escaping `(`, `)`, `|`, etc. by default would be a **breaking change** for existing projects.

## 4) Security posture / impact notes

- This is a build-time configuration behavior; it is not attacker-controlled.
- It does not by itself expose data that isn’t already served by the origin.
- The realistic risk is accidental misconfiguration: a developer believes an exclusion matches a literal filename, but it does not, so the file remains listed/cached per broader include rules.

## 5) Suggested improvement (documentation / tooling)

Given this appears to be intentional and relied upon, a safer path than changing matching semantics would be:

- Improve docs/examples to show escaping for common metacharacters (e.g. `\\(`, `\\)`, `\\|`, `\\$`).
- Add a lint/warning in the build tooling (heuristic/opt-in) when a negative pattern contains unescaped regex metacharacters and is likely intended as a literal path.

## 6) Reproduction (safe, local)

To demonstrate the footgun without changing any Angular code:

1) Create an Angular app with service worker enabled (e.g. via `ng add @angular/pwa`).
2) Add a file with metacharacters in the name, e.g. `src/assets/secret(1).txt`.
3) Add an exclusion using the **unescaped** pattern: `"!/assets/secret(1).txt"`.
4) Build and observe the file is still included by broader patterns.
5) Change the exclusion to the **escaped** form: `"!/assets/secret\\(1\\).txt"`.
6) Rebuild and observe the exclusion now applies as intended.
