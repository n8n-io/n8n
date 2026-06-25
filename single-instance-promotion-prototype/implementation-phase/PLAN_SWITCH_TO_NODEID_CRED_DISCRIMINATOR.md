# Plan: Switch EnvironmentCredentialBinding discriminator from `sourceCredentialId` to `(nodeId, credentialType)`

## Context

The current schema uses `sourceCredentialId` as the key that identifies which credential in a workflow gets substituted in a given environment:

```
(workflowId, environmentId, sourceCredentialId) → targetCredentialId
```

This is limiting: if two nodes both use the same credential on dev but need different credentials in prod, there is no way to express that — only one mapping is possible per source credential per environment. Switching the discriminator to `(nodeId, credentialType)` — where `nodeId` is the node's UUID from the workflow definition and `credentialType` is the key in `node.credentials` (e.g. `"httpQueryAuth"`) — makes the binding resolve at the exact credential slot level, removing this constraint.

## Migration strategy

The existing migration `1784000000039-CreateEnvironmentCredentialBinding.ts` is on an unreleased feature branch and has not been deployed to production. **Update it in place** rather than creating a new migration on top — this keeps the schema history clean and avoids a throw-away data migration (existing binding rows reference `sourceCredentialId` which would be meaningless after the change).

## Files to change

### 1. DB entity
`packages/@n8n/db/src/entities/environment-credential-binding.ts`
- Remove the `sourceCredentialId` column, its `@ManyToOne` relation, and the `sourceCredential` property
- Add `nodeId: string` — `@Column({ type: 'varchar', length: 36 })`
- Add `credentialType: string` — `@Column({ type: 'varchar', length: 255 })`

### 2. DB migration (update in place)
`packages/@n8n/db/src/migrations/common/1784000000039-CreateEnvironmentCredentialBinding.ts`
- Replace the `sourceCredentialId` column definition with `nodeId varchar(36)` and `credentialType varchar(255)`
- Remove the FK from `sourceCredentialId → credentials_entity(id)`
- Update the unique index from `(workflowId, environmentId, sourceCredentialId)` → `(workflowId, environmentId, nodeId, credentialType)`

### 3. DB repository
`packages/@n8n/db/src/repositories/environment-credential-binding.repository.ts`
- `resolveTargetCredentialId(environmentId, workflowId, nodeId, credentialType)` — swap `sourceCredentialId` param for `nodeId` + `credentialType`
- `replaceAll(...)` — update the binding element type from `{ sourceCredentialId, targetCredentialId }` to `{ nodeId, credentialType, targetCredentialId }`

### 4. API types DTO
`packages/@n8n/api-types/src/dto/environments/environment-bindings.dto.ts`
- In `credentialBindingSchema`, replace `sourceCredentialId: z.string().min(1)` with `nodeId: z.string().min(1)` and `credentialType: z.string().min(1)`

### 5. Backend service
`packages/cli/src/services/project-environment.service.ts`

- **`initializeEnvironments`**: currently iterates credential IDs from nodes. Change to iterate `Object.entries(node.credentials ?? {})` to produce `(nodeId, credentialType, targetCredentialId)` tuples — one binding per credential slot, not per unique credential ID. On init, `targetCredentialId` is still set to `cred.id` (identity mapping).

- **`replaceCredentialBindings`**: The ownership validation currently checks both `sourceCredentialId` and `targetCredentialId` against the project's credentials. With the new schema there is no `sourceCredentialId` in the payload — validate only `targetCredentialId` values against the project. Update the `bindingsArray` shape accordingly.

- **`validateEnvironmentBindingsForPublish`**: Currently collects credential IDs from enabled nodes and checks them against `b.sourceCredentialId`. Change to collect `(nodeId, credentialType)` pairs (one per `Object.entries(node.credentials ?? {})` entry) and check them against `b.nodeId + b.credentialType`. Update `MissingBinding` interface to include `nodeId` and `credentialType` alongside `credentialId`/`credentialName` so the UI can surface precise location info.

### 6. Credentials helper (execution-time resolution)
`packages/cli/src/credentials-helper.ts`

The resolution block at lines 403–413 currently passes `credentialsEntity.id` as the source key. Change to:
```typescript
if (additionalData.environmentId && additionalData.workflowId && executeData?.node.id) {
  const targetId = await this.environmentCredentialBindingRepository.resolveTargetCredentialId(
    additionalData.environmentId,
    additionalData.workflowId,
    executeData.node.id,   // nodeId — already available via existing executeData param
    type,                  // credentialType — already the `type` param of getDecrypted
  );
  ...
}
```
No interface changes needed — both values are already in scope.

### 7. Frontend API client
`packages/frontend/@n8n/rest-api-client/src/api/projectEnvironments.ts`
- Update `EnvironmentCredentialBinding` interface: replace `sourceCredentialId: string` with `nodeId: string` and `credentialType: string`
- Update the payload type of `replaceCredentialBindings` to match the new DTO shape

### 8. Frontend store
`packages/frontend/editor-ui/src/features/environments/environments.store.ts`
- Update `saveCredentialBindings` call: replace `{ sourceCredentialId, targetCredentialId }` elements with `{ nodeId, credentialType, targetCredentialId }`

### 9. Frontend component — WorkflowPublishModal
`packages/frontend/editor-ui/src/app/components/MainHeader/WorkflowPublishModal.vue`
- `envHasAllBindings`: currently extracts credential IDs from `node.credentials` and checks against `b.sourceCredentialId`. Change to extract `(nodeId, credentialType)` pairs via `Object.entries(node.credentials ?? {})` and match against `b.nodeId === node.id && b.credentialType === credType`

### 10. Tests
`packages/cli/src/__tests__/credentials-helper.test.ts`
- Update all environment-binding test fixtures and assertions to use `nodeId` + `credentialType` instead of `sourceCredentialId`. The test mock for `resolveTargetCredentialId` needs the new signature.

## Verification

1. **Type check**: `cd packages/cli && pnpm typecheck` and `cd packages/@n8n/db && pnpm typecheck`
2. **Unit tests**: `cd packages/cli && pnpm test credentials-helper`
3. **Manual flow**: boot the app, create a project with environments, open a workflow with a credentialed node, configure bindings, publish to an environment, run the workflow — confirm the correct (environment-specific) credential is used at execution time
