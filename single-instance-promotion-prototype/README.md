# Single-Instance Promotion — Prototype

## Webhook URL Behaviour

### Globally activated workflow (no environment publishing)

Webhooks use the standard n8n path with no prefix:

```
POST /webhook/{path}
POST /webhook/{uuid}/{path}        # dynamic paths
```

The workflow's `activeVersionId` snapshot is loaded on each call.

### Environment-published workflow

When a workflow is published to a named environment (e.g. **"Production"**, **"Staging"**), its webhooks are registered under an environment slug prefix:

```
POST /webhook/{env-slug}/{path}
```

The slug is derived from the environment name: lowercased, spaces replaced by hyphens.

| Environment name | Slug     | Webhook URL                        |
|------------------|----------|------------------------------------|
| Production       | production | `/webhook/production/{path}`     |
| Staging Env      | staging-env | `/webhook/staging-env/{path}`   |

The `WorkflowHistory` snapshot pinned for that environment is loaded on each call, so credential bindings are always environment-specific.

### Coexistence

A workflow can be globally activated **and** env-published simultaneously:

- `POST /webhook/{path}` → runs the global `activeVersion` snapshot
- `POST /webhook/production/{path}` → runs the environment-pinned snapshot

If a workflow has env-published versions, the global webhook path is **suppressed** and only the env-prefixed URLs are registered.

### Known limitations

- Dynamic webhook paths (`:param` segments) are not yet supported for env-published webhooks — the path-segment routing assumes a flat `{env-slug}/{static-path}` structure.
- Multi-main: env webhook activation bypasses the leader-only PubSub path; multi-main compatibility is a follow-up.
- Deactivation cleanup: `clearWebhooks()` removes all webhooks for a workflow regardless of prefix; scoped cleanup on unpublish is a follow-up.
