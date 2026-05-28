# Demo handover: stacked PR on #30956

Use this prompt to drive the strengthen-tests loop end-to-end and open a stacked PR that demonstrates the trial.

---

## Prompt

> I want to demo the mutation-health strengthen-tests loop from PR #30956. Drive the whole flow from a fresh branch and open a stacked PR.
>
> **Base branch**: `devp-stryker-mvp-spike` (the PR's branch — not master yet).
>
> **Steps**:
>
> 1. `git fetch origin && git checkout devp-stryker-mvp-spike && git pull && git checkout -b demo/strengthen-<file-basename>`
>
> 2. Query the live ledger to find the lowest-score red file:
>    ```bash
>    curl -sS 'https://internal.users.n8n.cloud/webhook/mutation-health-ledger?package=n8n-workflow' \
>      | jq '.ledger | map(select(.status == "red")) | sort_by(.last_score | tonumber) | .[0]'
>    ```
>    Use whatever it returns. As of 2026-05-22, that's `src/workflow-checksum.ts` at 38.64% — but check live state first.
>
> 3. Run the local mutation-testing skill on that file:
>    `/n8n:mutation-test packages/workflow/src/<picked-file>`
>
>    Confirm the output JSON shows the score and a list of survivors with mutator + location + covering tests.
>
> 4. Run the strengthen skill:
>    `/n8n:strengthen-tests`
>
>    It'll triage survivors (HIGH/MODERATE/LOW), edit the covering test file with targeted assertions, and re-run `n8n:mutation-test` to verify the score climbed. Max 5 survivors per pass.
>
> 5. Review the diff yourself: `git diff packages/workflow/test/`
>
>    Sanity-check each new assertion. Reject anything that's mocking-the-mock, asserting trivia, or pinning behaviour the source doesn't actually have. The skill is supposed to refuse to fabricate but humans verify.
>
> 6. If you want to push further, re-invoke `/n8n:strengthen-tests` for the next 5 survivors. Or move on.
>
> 7. Final verification:
>    `/n8n:mutation-test packages/workflow/src/<picked-file>`
>
>    Capture the before/after score for the PR body.
>
> 8. Push and open a stacked PR **against `devp-stryker-mvp-spike`** (not master):
>    ```bash
>    git push -u origin demo/strengthen-<file-basename>
>    gh pr create --draft --base devp-stryker-mvp-spike \
>      --title "test(core): strengthen <file-basename> assertions (demo) (no-changelog)" \
>      --body "<see template below>"
>    ```
>
> **PR body template:**
>
> ```markdown
> ## Summary
>
> Demo PR for #30956. Drives the `n8n:strengthen-tests` loop against `packages/workflow/src/<file>` to show the trial loop end-to-end.
>
> **Before**: <X>% mutation score, <N> survivors
> **After**:  <Y>% mutation score, <M> survivors
>
> Survivors addressed (with rationale):
> 1. <mutator at location> — added <which assertion> to <which existing test>
> 2. ...
>
> ## Test plan
> - [ ] `pnpm --filter=n8n-workflow mutate src/<file>` reproduces the post-score locally
> - [ ] `pnpm --filter=n8n-workflow test test/<file>.test.ts` passes
> - [ ] Each new assertion has a clear "this would have caught X bug" justification
> ```
>
> **Goals of the demo:**
>
> - Reviewer sees a real diff with surgical assertion edits, not big-bang test rewrites
> - The before/after numbers are reproducible (`pnpm mutate` gives the same answer to anyone)
> - The skill refused to fabricate or split low-leverage survivors out — what landed is what mattered
>
> **What NOT to do:**
>
> - Don't rewrite whole test files. The skill should only add/extend covering tests.
> - Don't bypass the verify step. Every change must be backed by a re-run that shows the score moved.
> - Don't auto-merge. This is a draft demo; the reviewer takes it forward.

---

## Why this is a good first PR for a reviewer

- Small (a handful of assertion lines)
- Numerically verifiable (run `pnpm mutate` yourself, see the same number)
- Demonstrates the full loop without committing to the AI auto-PR pipeline yet
- Stacked on `devp-stryker-mvp-spike` so the loop's machinery is already on the branch
