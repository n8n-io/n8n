# Instance-pull demo — git-backed workflow release

Demonstrates the flow: **raise a review on dev → PR opens against a production-workflows
repo → a GitHub Action dry-runs it against prd → red + a binding link if credentials are
missing → resolve them on prd → green → merge → prod imports + publishes.**

It's Terraform plan/apply for workflows: git = desired state, `--dry-run` = plan,
merge-to-main = apply, prd = the provider, the credential-binding page = "fill in the
required variables before apply can run".

Everything is gated by `N8N_INSTANCE_PULL_DEMO=true`.

## Pieces

| Piece | Where |
|---|---|
| `n8n deploy` CLI (productized) | `packages/@n8n/cli` — `n8n-cli deploy` |
| **Zero-dep CI script** (no n8n build needed) | `tasks/demo/n8n-deploy.mjs` — paste into the workflows repo |
| GitHub Actions | `tasks/demo/github-workflows/{deploy-dry-run,deploy-apply}.yml` |
| prd `/validate` + `/import` public API | `POST /api/v1/n8n-packages/{validate,import}` |
| prd credential-binding page | `https://<prd>/credential-binding/<pr>` |
| dev "Raise review" action | workflow editor → ⋯ menu (dev role only) |
| local launcher | `tasks/demo/start.sh` |

## 1. One-time setup

### a. The production-workflows repo (on GitHub)
1. Create an empty repo, initialise with a README so `main` exists.
2. Add `scripts/n8n-deploy.mjs` (copy `tasks/demo/n8n-deploy.mjs`).
3. Add `.github/workflows/deploy-dry-run.yml` and `deploy-apply.yml` (copy from `tasks/demo/github-workflows/`).
4. Branch protection on `main`: require the **Deploy dry-run (gate)** check + a PR before merge.
5. Repo secrets: `PRD_URL` (prd base URL reachable from the runner) and `PRD_API_KEY`.
6. A classic PAT with the `repo` scope (the dev instance uses it to push + open PRs).

### b. Reachability (the one real gotcha)
GitHub-hosted runners can't reach a `localhost` prd. Options:
- **Tunnel:** `cloudflared tunnel --url http://localhost:5679` (or ngrok) and set `PRD_URL` to the public URL.
- **Self-hosted runner** on a machine that can reach prd.
- **No-GitHub fallback:** skip the Action and run the script locally to simulate it:
  `node tasks/demo/n8n-deploy.mjs --instance http://localhost:5679 --dry-run --pr 1 <tree>`.

### c. Fill in `tasks/demo/instance-pull.env`
`INSTANCE_PULL_REPO_URL`, `INSTANCE_PULL_GH_OWNER`, `INSTANCE_PULL_GH_REPO`, `INSTANCE_PULL_GH_TOKEN`.

## 2. Run the two instances

```bash
pnpm build                       # or pnpm agent:setup build
./tasks/demo/start.sh dev        # http://localhost:5678
./tasks/demo/start.sh prd        # http://localhost:5679   (second terminal)
```

On **prd**, sign in and create an **API key** (Settings → API) — put it in the repo's `PRD_API_KEY` secret.

## 3. The demo

1. **dev**: build a workflow, then ⋯ menu → **Raise review** → a PR opens on the workflows repo.
2. The PR's **Deploy dry-run** check runs the script against prd. If a credential is missing it goes **red** and a sticky comment links to `https://<prd>/credential-binding/<pr>`.
3. Open that link on **prd** → see the required credential → **Bind existing** or **Create new** (prefilled).
4. **Re-run** the failed check → it goes **green** (merge unblocks).
5. **Merge** the PR → the **Deploy apply** Action imports + publishes → the workflow is **live and active on prd**.

## Known limitations (POC)
- Import is additive: a workflow deleted from `main` is not removed/deactivated on prd.
- The "Resolved" badge uses read-access; the dry-run re-run is authoritative.
- In-memory binding sessions (lost on prd restart — just re-run the dry-run).
- Production would gate the binding controller behind an operator scope and solve cross-instance credential identity properly.
