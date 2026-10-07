# Scripted LLM

The scripted LLM is a small HTTP server for tests and local demos. It speaks the
Anthropic Messages API (`POST /v1/messages`). It sends JSON replies and
streamed (SSE) replies. It answers from a script, not from a model. Thus the
n8n Assistant gives the same replies on each run. It needs no real API key and
no network.

This code is for tests only. It is not part of the n8n product.

## Script format

A script is a JSON object. The server validates it with zod when it starts.

```json
{
  "rules": [
    {
      "id": "after-search",
      "when": { "afterTool": "search" },
      "reply": { "text": "The search is complete." }
    },
    {
      "id": "call-search",
      "when": { "userText": "weather", "toolAvailable": "search" },
      "reply": {
        "text": "I will search.",
        "toolCalls": [{ "name": "search", "input": { "query": "weather in Berlin" } }]
      },
      "times": 1
    }
  ],
  "fallback": { "text": "Done." }
}
```

For each request, the server uses the first rule in the list that matches.
A rule matches when all of its `when` fields match:

| Field | Matches when |
|---|---|
| `userText` | This regular expression matches the last text block of the latest user message. The match ignores case. A latest message that holds only tool results has no user text. |
| `afterTool` | The last tool result in the latest message answers a tool call with this name. |
| `systemIncludes` | This regular expression matches the system prompt. The match is case-sensitive. |
| `toolAvailable` | The request offers a tool with this name. |

A rule with an empty `when` matches all requests. Use `times` to limit how
often a rule can match. When no rule matches, the server replies with the
`fallback` text. The default fallback text is `Done.`.

A reply can have text, tool calls, or both. A reply with tool calls stops with
`stop_reason: "tool_use"`. Other replies stop with `"end_turn"`. Tool-call ids
are `toolu_scripted_1`, `toolu_scripted_2`, and so on, for each server.

The server does not send a tool call when the request does not offer that
tool. It sends the rule text instead, or the fallback text when the rule has no
text. `requests()` lists the skipped tools in `skippedTools`.

Rule ids must be unique. Do not use the id `fallback`.

## Use it in a test

```ts
import { startScriptedLlm } from '../services/scripted-llm/scripted-llm.server';

const llm = await startScriptedLlm({ script });
// Start n8n with the variables below. Set N8N_INSTANCE_AI_MODEL_URL to `llm.modelUrl`.
// ...
expect(llm.requests().map((request) => request.ruleId)).toEqual(['call-search', 'after-search']);
await llm.stop();
```

The server binds to `127.0.0.1`. It uses a free port unless you set `port`.
`llm.url` is the server origin. Use it as `baseURL` for the Anthropic SDK.
`llm.modelUrl` is `llm.url` with `/v1` at the end. Use it for n8n.
`requests()` returns one entry for each answered request: `ruleId`, `stream`,
`model`, `lastUserText`, `lastToolResult` and `skippedTools`.

## Run a local demo

1. Write a script to a JSON file.
2. Start the server from `packages/quality/testing/playwright`:

   ```bash
   pnpm exec tsx services/scripted-llm/cli.ts path/to/script.json --port 4010
   ```

3. Start n8n with these environment variables:

   ```bash
   N8N_INSTANCE_AI_MODEL=anthropic/claude-scripted
   N8N_INSTANCE_AI_MODEL_URL=http://127.0.0.1:4010/v1
   N8N_INSTANCE_AI_MODEL_API_KEY=scripted
   ```

The model URL must end with `/v1`. n8n has two code paths for Anthropic
models:

- When `HTTP_PROXY` or `HTTPS_PROXY` is set, n8n gives the URL to the AI SDK
  client as it is. The client adds only `/messages`.
- In the other path, n8n adds `/v1` only when the URL does not end with `/v1`.

Thus a URL that ends with `/v1` works in both paths. The server answers
`POST /messages` with a 404 error, so a URL without `/v1` fails in the proxy
path.

When `HTTP_PROXY` or `HTTPS_PROXY` is set, make sure that `NO_PROXY` includes
`127.0.0.1`. If it does not, n8n sends the model requests to the proxy.

The Anthropic client requires an API key value. The server ignores the key,
so any placeholder value is correct.
