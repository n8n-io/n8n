# Knowledge live retrieval harness

Dev tooling of the live retrieval PoC. None of it is product code. The plan
and the experiment design live in
[.agents/specs/knowledge-live-retrieval-poc.md](../../.agents/specs/knowledge-live-retrieval-poc.md).

| Script | Command | What it does |
| --- | --- | --- |
| `seed-sources.mjs` | `pnpm knowledge:seed-sources` | Writes the test content to Notion and Slack and records the ids in `fixtures/items.json`. |

Secrets come from env vars. Never pass one as a command argument: the dev
metrics record pnpm arguments.

## Seeding

```sh
NOTION_SEED_TOKEN=… NOTION_SEED_ROOT_PAGE_ID=… SLACK_SEED_USER_TOKEN=… pnpm knowledge:seed-sources
```

| Env var | Meaning |
| --- | --- |
| `NOTION_SEED_TOKEN` | Internal integration secret. The integration needs read, insert and update content capabilities, and the root page must be shared with it. The same token backs the `notionApi` credential of the test agents. |
| `NOTION_SEED_ROOT_PAGE_ID` | The page under which the script creates its seed page. |
| `SLACK_SEED_USER_TOKEN` | User OAuth token (`xoxp-…`) of the test app in the test workspace, from "Install to Workspace" on the app's OAuth page. The messages must come from a person, not a bot, so that message search finds them without extra options. |
| `SKIP_NOTION`, `SKIP_SLACK` | `true` skips that source and keeps its section of `items.json` from the earlier run. |
| `KB_ROWS` | Generated rows in the Support KB data source. Default 300. |
| `SEED` | Seed of the row generator. Default 1. Same seed, same rows. |

What it creates:

- Notion, under one page `[seed] Knowledge PoC`: the pages in
  `fixtures/content.mjs` (two refund policies, a pricing FAQ, an onboarding
  guide with child pages, a page that no agent picks), and a Support KB
  database with about 300 rows. Three rows hold the facts the questions
  target; two of those have poor titles on purpose.
- Slack: `#seed-support` with a few threads and `#seed-not-picked` with the
  scope probe. Messages are posted by the token's user.

A re-run moves the earlier seed page to the Notion trash and deletes the
messages the seed user posted in the seed channels, then writes everything
again. Slack channels cannot be deleted through the API, so the channels stay.
Point the script at a test workspace only.

Rate limits: about three Notion requests per second and one Slack post per
second. A full Notion run takes a few minutes.

## Output

`fixtures/items.json` is environment-specific and not committed. It holds, per
source, the picked items in the shape of the agent config (`id`, `kind`,
`containerType`, `title`, `url`), the items that no agent picks, and the ids
of the needle rows and threads so the question set can check citations.
