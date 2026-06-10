# Instance AI smoke tests

This suite is deliberately tiny. It verifies that the end-to-end machinery
works — the module boots, a user can open the AI Assistant, send a message,
and a streamed response renders and persists. Nothing else.

## What is tested where

| Concern | Where it lives |
|---|---|
| The app + module + chat API + streaming + UI don't crash | here (smoke) |
| Agent behaviour: planning, building, tool use, confirmations, setup | evals (`packages/@n8n/instance-ai/evaluations`, LangSmith) |
| Component/store logic | unit tests (`packages/@n8n/instance-ai`, editor-ui Vitest) |

## How the LLM is stubbed

A single MockServer catch-all expectation answers ANY `POST /v1/messages`
with one fixed Anthropic SSE stream (see `anthropicTextStream` in the spec).
There is no matching against request bodies, so changes to prompts, skills,
or agent flow cannot break these tests.

Everything else is real: the sandbox service runs for real because every
agent run materializes runtime skills into a sandbox workspace before
responding (and the chat input is gated on sandbox availability) — so the
smoke run also covers module boot, workspace setup, chat API, streaming,
and thread persistence.

This replaces the previous record/replay setup (per-test recorded
expectations matched against prompt-text regexes), which broke whenever
prompts drifted and required re-recording against the real Anthropic API.
Do not reintroduce recorded fixtures here — if a test needs the agent to
*behave* a certain way, it belongs in the evals.

## Multi-main

Instance AI does not support multi-main yet (implementation deferred), so
the capability config pins `mains: 1`; the multi-main CI project runs the
suite against a single-main stack.
