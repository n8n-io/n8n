# Knowledge live retrieval harness

Dev tooling of the live retrieval PoC. None of it is product code. The plan
and the experiment design live in
[.agents/specs/knowledge-live-retrieval-poc.md](../../.agents/specs/knowledge-live-retrieval-poc.md).

| Script | Command | What it does |
| --- | --- | --- |
| `seed-sources.mjs` | `pnpm knowledge:seed-sources` | Writes the test content to Notion and Slack and records the ids in `fixtures/items.json`. |
| `run.mjs` | `pnpm knowledge:harness smoke [agent]` | Creates or updates a test agent from `fixtures/agent.json` and `fixtures/items.json` through the REST API, asks it questions over the chat stream and reads the thread executions. `smoke` asks one fact question and one scope probe per source; the agent is `kb-native` by default, or `kb-mcp-c0` for the baseline. |
| `run.mjs` | `pnpm knowledge:harness run [agents] [repeat]` | The question set of `fixtures/questions.json` against the agents (default `kb-native,kb-mcp-c0`), `repeat` times each (default 3). Rebuilds the indexes of the `index` sources first, scores every answer, and writes a results table. `HARNESS_QUESTIONS=id,id` limits the questions. |

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

## Running the agents

```sh
N8N_EMAIL=… N8N_PASSWORD=… N8N_PROJECT_ID=… N8N_MODEL_CREDENTIAL_ID=… N8N_NOTION_CREDENTIAL_ID=… pnpm knowledge:harness smoke
```

The instance needs `N8N_KNOWLEDGE_LIVE_SOURCES_ENABLED=true`, otherwise the
agents get no live knowledge tools and answer from nothing.

| Env var | Meaning |
| --- | --- |
| `N8N_BASE_URL` | The instance. Default `http://localhost:5678`. |
| `N8N_EMAIL`, `N8N_PASSWORD` | The owner or a member of the project. The script logs in through `POST /rest/login`. |
| `N8N_PROJECT_ID` | The project that holds the credentials and gets the test agents. |
| `N8N_MODEL_CREDENTIAL_ID` | The Anthropic credential of the test agents. |
| `N8N_MODEL` | The model of every test agent. Default `anthropic/claude-sonnet-4-5`. Keep one snapshot for a whole comparison. |
| `N8N_NOTION_CREDENTIAL_ID` | The `notionApi` credential. Without it the Notion source is left out. |
| `N8N_SLACK_CREDENTIAL_ID` | The `slackApi` credential. Without it the Slack source is left out. |
| `N8N_NOTION_MCP_CREDENTIAL_ID`, `N8N_SLACK_MCP_CREDENTIAL_ID` | The `mcpOAuth2Api` credentials of the hosted Notion and Slack MCP servers, for `kb-mcp-c0`. Create them in the editor: add an MCP server with the URL of `fixtures/agent.json` to any agent and connect it. The Notion consent screen grants a whole workspace, not pages: connect the workspace that holds the seed page, and keep company data out of it, because the baseline reads anything in that workspace and the content then lands in the thread and in `results/`. A server without a credential is left out. |
| `CHAT_TIMEOUT_MS` | Wait per question. Default 600000. A question that runs longer is recorded as a failed run with the error, and the run goes on. |
| `HARNESS_SKIP_INDEX_REBUILD` | `true` reuses the indexes an earlier run built (they live in the instance until it restarts) instead of rebuilding them, which takes minutes for a large data source. |
| `HARNESS_AGENTS_FILE`, `HARNESS_RESULTS_DIR` | Where the created agents and the results go. For tests of the script against a fake instance, so they never touch the real state. |

`fixtures/agent.json` holds the shared instructions, the source descriptions,
the hosted MCP servers of the baseline and the per-agent deltas (`retrieval`
per source, or `mcp` for the baseline). The script fills the credentials and
the picked items from `items.json`. The baseline gets the picked items as a
list in its instructions, because the hosted servers see the whole workspace. The agents it created are
remembered in `fixtures/agents.json` (not committed) and updated on every run.
`results/` holds one JSON file per harness run: the questions, the answers,
the tool calls of the stream, the thread detail of each run and `outOfSeed`:
the tool calls that named an id the seed did not write. The run prints them
as `OUT OF SEED` lines. On the live tools that is a bug; on the MCP baseline
it is a scope violation, or a grant that covers more than the seed page.

## Questions and scoring

`fixtures/questions.json` holds the question set: two or more questions per
class (`item`, `container`, `datasource`, `disambiguation`, `freshness`,
`context`, `scope`) per source. A fact question names the texts an answer
must contain (`expectContains`, any of them) and the item it must cite
(`expectUrl`, a path into `items.json` such as `notion.needles.kb-2fa-reset`;
a Notion citation must hold the page id, a Slack citation the channel and the
thread ts). A scope probe expects the refusal line and forbids the texts of
the not-picked item (`forbidContains`). A run passes when the answer and the
citation are right, or the refusal is right, and no tool call named a
not-picked id (a scope violation). An `OUT OF SEED` read is a warning, not a
violation: in a seed-only workspace it is a row or a reply inside a picked
container that `items.json` does not list.

`run` writes `results/run-<time>.json` after every answer (`partial: true`
until the run ends, so a crash keeps what was measured) and `.md` with two
tables: per agent and class (pass rate, answers, citations, refusals,
violations, average prompt tokens, total tokens per pass, tool calls, median
wall time), and per question and agent with one mark per repetition (`P`
pass, `F` fail, `V` fail with a scope violation).

## Output

`fixtures/items.json` is environment-specific and not committed. It holds, per
source, the picked items in the shape of the agent config (`id`, `kind`,
`containerType`, `title`, `url`), the items that no agent picks, the ids of
the needle rows and threads so the question set can check citations, and
every Support KB row id (`rowIds`), so a read of a row inside the picked data
source is not mistaken for a page outside the seed.
