<task>
You are an expert software engineer doing a high-confidence bug hunt in the Angular monorepo (https://github.com/angular/angular).
Your goal: find 1–3 real, non-trivial bugs (correctness / reliability / security / perf), produce a minimal reproduction (preferably a failing test), and propose a small, reviewable fix that matches existing project patterns.
</task>

<context>
Angular is a large, widely-used framework. False positives waste time.
Optimize for: (a) reproducible behavior, (b) clear root cause in code, (c) small fix + regression test.
I prefer fewer findings with strong evidence over many speculative ones.

**Important**: Even if no bugs are found, well-designed tests that prove security properties are valuable as regression coverage.
</context>

<engagement_rules>
If BugBounty/ contains program-specific constraints (scope, exclusions, reporting format),
treat it as the source of truth and follow it.
Do not propose submissions that conflict with BugBounty rules.
</engagement_rules>

<success_criteria>
A finding only "counts" if you can provide:
1) Exact file paths + key code locations involved
2) A concrete reproduction (ideally a new or existing failing test)
3) A credible explanation of why it's a bug (not intended behavior)
4) A minimal fix + regression test strategy
</success_criteria>

<investigate_before_answering>
Never speculate about code you have not opened.
Read and understand relevant files before proposing any fix.
When uncertain, keep investigating until you can ground the claim in code + repro.
</investigate_before_answering>

<scope>
Pick ONE primary focus area to start (choose based on what looks most bug-prone after quick exploration):
- compiler / template type-checking
- change detection / signals / reactivity
- router navigation + async scheduling
- forms + validators
- platform-server / hydration
You may expand scope only if you hit a dead end.
</scope>

<process>
## Phase 0: Historical Analysis (CRITICAL - Do This First)
Before generating new hypotheses, study what has been vulnerable before:

1. Read BugBounty/Historical-Issues.md to understand:
   - Recent CVEs and security advisories (dates, severity, root causes)
   - Recurring vulnerability patterns (sanitization, SSR, XSRF, etc.)
   - Which packages have had multiple issues

2. Check recent security-related commits:
   - `git log --oneline --grep="security\|CVE\|GHSA" --since="6 months ago"`
   - Understand what was fixed and WHY it was vulnerable

3. Prioritize areas that:
   - Had recent fixes (may have incomplete fixes or related issues)
   - Match historical vulnerability patterns
   - Have complex trust boundaries (user input → internal processing)

## Phase 1: Explore & Map
1) Identify top-level packages and where the focus area lives
2) Find existing tests and harnesses for that area
3) **Discover the test command pattern** (critical for this repo):
   - Angular uses Bazel: `corepack pnpm test //packages/path:test`
   - Filter specific tests: `--test_arg=--filter="pattern"`
   - Example: `corepack pnpm test //packages/platform-server/test:test --test_arg=--filter="SSR"`

## Phase 2: Generate Hypotheses
Generate 5–10 candidate bug hypotheses, then rank by:
- Likelihood of being real (based on historical patterns)
- Ease of proving with a test
- Impact (security > correctness > performance)

**Before selecting a hypothesis, check:**
- Has this pattern been fixed recently? (may be hardened)
- Are there existing tests covering this? (may already be verified)
- Is there an architectural reason it's safe? (e.g., synchronous execution preventing races)

## Phase 3: Test Each Hypothesis
For each selected hypothesis:

a) **Locate exact code path** (search, open files, trace call flow)

b) **Check for existing mitigations:**
   - Look for validation, sanitization, or guards in the code path
   - Check if similar patterns are tested elsewhere
   - Understand the execution model (sync vs async, isolation mechanisms)

c) **Try to reproduce:**
   - Prefer running the smallest relevant existing test target first
   - If none exists, study existing test patterns in that directory BEFORE writing new tests
   - Match local conventions (imports, helper functions, describe/it structure)

d) **Know when to abandon:**
   - If 3+ variations of your test pass → the code is likely robust
   - If you find the mitigation in code → document it and move on
   - Max 2-3 hours per hypothesis before pivoting

## Phase 4: Document & Report
Once reproduced:
- Explain root cause with precise references to code
- Propose a minimal fix (avoid refactors unless necessary)
- Add regression coverage

If NOT reproduced:
- Document why (existing mitigation, architectural safety, etc.)
- The tests you wrote still have value as regression coverage
</process>

<state_tracking>
Primary state is stored in BugBounty/TestedVectors.md.

At session start:
- Read BugBounty/README.md (program rules) if it exists
- Read BugBounty/Historical-Issues.md for vulnerability patterns
- Read BugBounty/TestedVectors.md and avoid re-testing logged vectors unless you have a new angle

During the hunt:
- For every attempted vector (even "failed to reproduce"), append a new entry to BugBounty/TestedVectors.md
- Include: hypothesis, files inspected, exact commands/tests run, and result (✅/❌/⚠️/🧪)
- Document WHY something wasn't vulnerable (helps future hunters)
</state_tracking>

<common_false_positives>
Learn from vectors that LOOK vulnerable but aren't:

1. **Global state in SSR**: Variables like `instructionState` appear dangerous but Angular's synchronous rendering model prevents interleaving between requests.

2. **Module-level caches**: Often safe because they're initialized once at startup, not modified per-request.

3. **Recently fixed patterns**: Code near recent security fixes is often hardened. Check git blame before investing time.

4. **DI-isolated values**: Angular's dependency injection creates per-request isolation even when code appears to share state.

5. **Browser-mitigated attacks**: Some theoretically vulnerable patterns (like certain XSS vectors) are blocked by modern browsers.

When you encounter these patterns, verify the mitigation exists before marking as "not a bug."
</common_false_positives>

<tooling_guidance>
- **Test discovery**: Look at `packages/*/test/` directories for patterns. Check for helper files like `*_utils.ts` or `test_helpers.ts`.
- **Running tests**: `corepack pnpm test //package/path:test --test_arg=--filter="TestName"`
- **Verbose output**: Add `--test_output=all` to see test logs
- **Building first**: Some tests require building: `corepack pnpm build`
- **Git history**: Use `git log --oneline -20 path/to/file.ts` to see recent changes
- **Blame**: Use `git blame path/to/file.ts` to understand code evolution

Prefer targeted tests over full test suites.
Use git history/blame when it helps confirm intent/regression.
</tooling_guidance>

<parallel_exploration>
When exploring a new area, launch 2-3 Explore agents in parallel with different focuses:
- Agent 1: Find the core implementation files
- Agent 2: Find existing security tests and patterns
- Agent 3: Check historical fixes and related code

This gives comprehensive context faster than sequential exploration.
</parallel_exploration>

<output_format>
Return results in this structure:

<overview>
- Focus area chosen:
- Historical context (relevant CVEs/patterns):
- What you inspected (high level):
- Commands you ran (summarized):
</overview>

<findings>
For each confirmed bug:
- Title:
- Severity/impact (brief):
- Preconditions:
- Reproduction:
  * test name / file added / exact command
- Root cause:
  * file paths + explanation
- Fix:
  * minimal patch description (and why it's safe)
- Regression test:
  * what it asserts and why it prevents reintroduction
</findings>

If you don't find a confirmed bug, output:
- What you searched
- The most promising hypotheses and why they didn't reproduce
- Tests added as regression coverage (still valuable!)
- Next best directions
</output_format>
