# Phase F — Visual workflow diff on the PR

> A new phase for the instance-pull prototype (`tasks/plan.md`, after Phase E).
> Same throwaway-POC altitude — implementation choices are the engineer's; this
> sets the goal, the hard constraint that shapes it, and the demoable outcome.

## Goal

When a review is raised, the PR should show a **visual diff of the workflow
change** — the n8n diff viewer (`editor-ui/.../workflowDiff`) — so a reviewer can
see *what changed* without opening either instance. The **prd** instance produces
it, because prd holds the current prod state and can diff "incoming PR workflow
vs what prod runs today" — the diff that actually matters for a publish.

## The constraint that shapes everything

**GitHub sanitizes PR/comment markdown — no `<iframe>`, no `<script>`, no live
embeds.** So the diff viewer can't be embedded *live* in the PR. We deliver
**both** complementary forms, built on one shared diff route:

1. **A static image** — a screenshot of the diff viewer, embedded via `![](url)`.
   Always visible inline, to anyone viewing the PR, even without n8n access.
2. **A link** — a hyperlink to the live, interactive diff viewer served by the
   prd instance. Clickable by anyone who can reach that instance (in the local
   demo that's localhost while logged in; in prod it's the instance's editor URL
   behind normal auth).

They reinforce each other: the image is the universal, always-on artifact; the
link is the "open it and explore" upgrade. And the image is literally a headless
screenshot of the page the link opens — so it's **one route, two outputs**.

## Recommended shape (prd-side, hangs off the existing validate loop)

1. prd serves a **diff route** keyed by PR (e.g. `/instance-pull/diff?pr=<n>`)
   that resolves the **incoming** workflow (from the PR's `.n8np` package) vs the
   **current prod** workflow and renders the diff viewer. This single route backs
   both outputs.
2. prd renders that route to a **PNG** via a headless screenshot (the real work —
   see below).
3. prd updates the existing bot comment (`upsertComment`) to include **both** the
   image and an **"Open interactive diff ↗" link** to the route, next to the
   red/green check and credential blockers.

Image hosting options (pick one — engineer's call):
- **Commit the PNG into the PR branch** and reference it by raw URL
  (`raw.githubusercontent.com/<owner>/<repo>/<branch>/…png`). Self-contained, prd
  already has push. Minor wrinkle: prd writes to the (dev-owned) branch.
- **External object storage** (the S3/R2 from the transport spike) → embed/link.
  More moving parts, but keeps prd off the branch.
- GitHub's drag-drop attachment endpoint is undocumented — avoid.

## What it demonstrates — Checkpoint F (DEMOABLE)

Raising a review (or the next prd validate cycle) makes the PR's bot comment show
a **rendered visual diff image** of the workflow change **plus an "Open
interactive diff ↗" link**, alongside the existing check and blockers. A reviewer
sees the change inline in GitHub, and can click through to explore it live in prd.

## The real work / risks

- **Headless render.** The diff viewer is a Vue component; capturing it needs a
  browser screenshot (Playwright/Puppeteer) of an **embeddable diff route** that
  loads `(sourceWorkflow, targetWorkflow)` and renders just the diff canvas.
  - **Verify the embeddable surface exists** — the user mentioned an iframe-able
    diff viewer; confirm the exact route and that it renders headlessly *without*
    full app chrome or an authed session.
  - **Playwright is a dev/test dep, not a cli runtime dep.** prd spinning a
    headless browser in-process is the biggest unknown — confirm availability, or
    treat rendering as a small separate step the demo shells out to.
- **Which diff** — incoming-vs-prod (prd-computed, recommended) vs feat-vs-base
  (the git diff). The former is more meaningful and justifies prd as producer.
- **Architecture fit** — prd posting an image is consistent with prd already
  commenting (control plane, not pushing workflow data into prod). Committing the
  PNG to the branch is the one place prd touches dev's branch — note or avoid via
  external hosting.

## Lighter fallback (if headless render won't fit the timebox)

Post a **structured/textual diff** in the bot comment — nodes added / removed /
changed, connection changes — reusing the markdown approach already used for
blocking issues, from diff data the validate step can compute without a browser.
Not the visual viewer, but demoable and cheap. Ship this if rendering slips, and
layer the image on top later.

## Scope

- **Build:** a prd-served diff route (incoming-vs-prod) → headless screenshot to
  PNG → host it → bot comment carries **both the image and the link**.
  Checkpoint F.
- **Keep in mind:** reuse of transport-spike storage for image hosting; the link's
  base URL comes from the prd instance's editor URL (localhost in the demo).
- **Out:** a live interactive iframe inside the PR (impossible — GitHub
  sanitisation) · a production rendering service · multi-workflow diffs · making
  the prd diff route reachable to people *without* instance access (the image
  covers them).

## Open questions

- Does the embeddable diff route exist, and can it render headlessly without auth?
- Diff basis: incoming-vs-prod or feat-vs-base?
- Image hosting: commit-to-branch vs external storage?
- Link base URL — the prd editor URL (localhost for the demo); does the route need
  to work without a full session, or is "logged-in reviewer" fine for the demo?
