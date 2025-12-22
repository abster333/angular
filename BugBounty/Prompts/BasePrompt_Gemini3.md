<context>
You are running a security-oriented bug hunt in the Angular monorepo: https://github.com/angular/angular.
Use the BugBounty workspace:
- BugBounty/README.md (scope + reporting rules)
- BugBounty/TestedVectors.md (log every tried vector)
- BugBounty/Notes/, BugBounty/Repros/, BugBounty/Patches/
</context>

<task>
Find ONE new, high-confidence bug (preferably security-impacting) in Angular.
Work iteratively via “vectors” and log every attempt.
</task>

<constraints>
- Do not claim a bug without a repro (failing test or minimal repro project/script).
- Do not guess commands; discover how to run relevant tests from repo scripts/docs and record exact commands.
- Avoid re-testing ideas already in BugBounty/TestedVectors.md.
- Keep scope tight: focus on one vector at a time.
- Output must be concise but include evidence (paths + commands + results).
</constraints>

<process>
1) Read BugBounty/README.md and BugBounty/TestedVectors.md.
2) Propose 3–5 candidate vectors (each with AREA + 1–2 sentence hypothesis + likely target paths).
3) Pick the highest-signal vector and assign the next ID (V-###) for today.
4) Execute: inspect relevant code → craft minimal repro or failing test → run the smallest relevant test command(s).
5) Conclude with a status (✅/❌/⚠️/🧪) and produce a ready-to-paste TestedVectors.md entry with:
   - Status, Hypothesis
   - Code surfaces touched (paths)
   - Repro attempt: Command(s)
   - Test(s) added/modified
   - Observed result / Expected result
   - Notes / next step
   - Links (issues/PRs/commits/docs)
</process>

<first_output_format>
A) Candidate vectors list (3–5 bullets)
B) Selected vector (V-###) plan (5–10 steps)
Then proceed to implementation.
</first_output_format>
