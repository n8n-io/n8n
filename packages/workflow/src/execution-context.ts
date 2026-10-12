import z, { type ZodType } from 'zod/v4';

import { jsonParse } from './utils';

/**
 * JSON-shaped value type — what survives an encrypt → JSON serialize →
 * decrypt → JSON parse round-trip. Used as the leaf type for secure artifacts.
 */
type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | { [key: string]: JsonValue } | JsonValue[];

const JsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
	z.union([
		z.string(),
		z.number(),
		z.boolean(),
		z.null(),
		z.record(z.string(), JsonValueSchema),
		z.array(JsonValueSchema),
	]),
);

const SecureArtifactsSchemaV1 = z.object({
	version: z.literal(1),

	/**
	 * Artifacts produced by context-establishment hooks (e.g. a trigger
	 * stripper) and consumed by node backends later in the execution.
	 *
	 * Keyed by the logical alias an operator assigned in the
	 * `N8N_SECURITY_SENSITIVE_FIELD_RULES` configuration. The value is an
	 * array of leaves extracted from the trigger items that matched the
	 * rule — one entry per item that produced a value. Aliases with no
	 * matching items are omitted entirely.
	 */
	artifacts: z.record(z.string(), JsonValueSchema),

	/**
	 * Optional metadata produced by the hook (e.g. provenance, hook id).
	 */
	metadata: z.record(z.string(), z.unknown()).optional(),
});

export type ISecureArtifactsV1 = z.output<typeof SecureArtifactsSchemaV1>;

export const SecureArtifactsSchema = z
	.discriminatedUnion('version', [SecureArtifactsSchemaV1])
	.meta({
		title: 'ISecureArtifacts',
	});

/**
 * Decrypted structure of the `secureArtifacts` field on the execution context.
 * Carries values produced by context-establishment hooks (e.g. trigger
 * stripping) for later consumption by node backends. Always encrypted as a
 * single string when stored on `IExecutionContext`; only exists in this
 * structured form on `PlaintextExecutionContext` during runtime.
 *
 * @see PlaintextExecutionContext.secureArtifacts
 */
export type ISecureArtifacts = z.output<typeof SecureArtifactsSchema>;

/**
 * What a run needs to keep verifying its token once the OAuth protected resource it was
 * granted access to can no longer be looked up. Resource descriptors are derived from
 * what routes the request, which stops existing when the trigger stops listening; a run
 * outlives that, so it carries the facts with it.
 *
 * Holds no authorization *decision* — only its inputs, so every check stays live.
 */
export interface OAuthResourceGrant {
	/** `aud` values a token issued for this resource may carry. */
	audiences: string[];
	/** Workflow the holder must keep `workflow:execute` on. Absent if none is required. */
	executeAccessWorkflowId?: string;
}

export const OAuthResourceGrantSchema = z.object({
	audiences: z.array(z.string()).min(1),
	executeAccessWorkflowId: z.string().optional(),
}) satisfies ZodType<OAuthResourceGrant>;

const CredentialContextSchemaV1 = z.object({
	version: z.literal(1),
	/**
	 * Identity token/value used for credential resolution
	 * Could be JWT, API key, session token, user ID, etc.
	 */
	identity: z.string(),

	/**
	 * Optional metadata for credential resolution
	 */
	metadata: z.record(z.string(), z.unknown()).optional(),
});

export type ICredentialContextV1 = z.output<typeof CredentialContextSchemaV1>;

export const CredentialContextSchema = z
	.discriminatedUnion('version', [CredentialContextSchemaV1])
	.meta({
		title: 'ICredentialContext',
	});

/**
 * Decrypted structure of credentials field
 * Never stored in this form - always encrypted in IExecutionContext
 */
export type ICredentialContext = z.output<typeof CredentialContextSchema>;

export const WorkflowExecuteModeList = [
	'cli',
	'error',
	'integrated',
	'internal',
	'manual',
	'retry',
	'trigger',
	'webhook',
	'evaluation',
	'chat',
	'agent',
] as const;

const WorkflowExecuteModeSchema = z.enum(WorkflowExecuteModeList);

export type WorkflowExecuteModeValues = (typeof WorkflowExecuteModeList)[number];

const RedactionPolicySchema = z.union([
	z.literal('none'),
	z.literal('all'),
	z.literal('non-manual'),
	z.literal('manual-only'),
]);

const RedactionSettingSchemaV1 = z.object({
	version: z.literal(1),
	policy: RedactionPolicySchema,
});

export type IRedactionSettingV1 = z.output<typeof RedactionSettingSchemaV1>;

const RedactionSourceSchema = z.union([z.literal('workflow'), z.literal('instance')]);

export type RedactionSource = z.output<typeof RedactionSourceSchema>;

/**
 * Per-channel redaction snapshot. Each channel records, independently, whether
 * execution data is redacted for production and manual executions. This is the
 * strictest-per-channel resolution of the workflow setting and the instance floor,
 * captured at execution time.
 *
 * `source` records which layer raised the bar:
 * - `'instance'` when the floor enforced redaction the workflow did not ask for.
 * - `'workflow'` otherwise (workflow setting met or exceeded the floor, including
 *   the floor='off' case).
 */
const RedactionSettingSchemaV2 = z.object({
	version: z.literal(2),
	production: z.boolean(),
	manual: z.boolean(),
	source: RedactionSourceSchema.optional(),
});

export type IRedactionSettingV2 = z.output<typeof RedactionSettingSchemaV2>;

/**
 * Redaction snapshot, versioned by shape. V1 stored a single policy enum; V2 stores
 * independent production/manual channels. Both shapes must keep parsing so execution
 * data persisted before the V2 migration remains readable.
 */
const RedactionSettingSchema = z.discriminatedUnion('version', [
	RedactionSettingSchemaV1,
	RedactionSettingSchemaV2,
]);

export type IRedactionSetting = z.output<typeof RedactionSettingSchema>;

const ExecutionContextSchemaV1 = z.object({
	version: z.literal(1),
	/**
	 * When the context was established (Unix timestamp in milliseconds)
	 */
	establishedAt: z.number(),

	/**
	 * The mode in which the workflow is being executed
	 */
	source: WorkflowExecuteModeSchema,

	/**
	 * Optional node where execution started
	 */
	triggerNode: z
		.object({
			name: z.string(),
			type: z.string(),
		})
		.optional(),

	/**
	 * Optional ID of the parent execution, if this is set this
	 * execution context inherited from the mentioned parent execution context.
	 */
	parentExecutionId: z.string().optional(),

	/**
	 * Encrypted credential context for dynamic credential resolution
	 * Always encrypted when stored, decrypted on-demand by credential resolver
	 * @see ICredentialContext for decrypted structure
	 */
	credentials: z.string().optional().meta({
		description:
			'Encrypted credential context for dynamic credential resolution Always encrypted when stored, decrypted on-demand by credential resolver @see ICredentialContext for decrypted structure',
	}),

	/**
	 * Encrypted artifacts produced by context-establishment hooks
	 * (e.g. a trigger stripper) for later consumption by node backends.
	 * Always encrypted when stored, decrypted on demand by
	 * `ExecutionContextService`.
	 * @see ISecureArtifacts for the decrypted structure.
	 */
	secureArtifacts: z.string().optional().meta({
		description:
			'Encrypted artifacts produced by context-establishment hooks. Always encrypted when stored, decrypted on-demand by ExecutionContextService. @see ISecureArtifacts for decrypted structure',
	}),

	/**
	 * Redaction setting captured at execution time.
	 * Persisted so the correct redaction policy is applied when reading execution data,
	 * regardless of any subsequent changes to the workflow setting.
	 */
	redaction: RedactionSettingSchema.optional(),

	/**
	 * The n8n user the execution ran as. Stamped at context establishment by
	 * deriving the user from the identity carrier with the same identifier that
	 * credential resolution uses, so the redaction owner cannot drift from the
	 * resolved user. Dynamic credential resolution re-affirms it on success. Used
	 * by the redaction layer to grant that user access to their own data, including
	 * a run that failed before the credential resolved. Absent when the identity is
	 * not an n8n user (external Slack/OAuth resolvers) or cannot be validated, so
	 * those executions stay redacted for everyone.
	 */
	executedByUserId: z.string().optional(),

	/**
	 * True when the workflow references a private (resolvable) credential.
	 * Stamped at context establishment, before any node runs, so a run that
	 * fails or stops before the credential resolves is still recognised as a
	 * dynamic-credential execution and redacted for everyone but the executing
	 * user — consistent with a successful run. The per-node
	 * `usedDynamicCredentials` runData flag only appears after resolution, so it
	 * cannot cover the failed/partial path on its own.
	 */
	usesDynamicCredentials: z.boolean().optional(),
});

export type IExecutionContextV1 = z.output<typeof ExecutionContextSchemaV1>;

export const ExecutionContextSchema = z
	.discriminatedUnion('version', [ExecutionContextSchemaV1])
	.meta({
		title: 'IExecutionContext',
	});

/**
 * Execution context carries per-execution metadata throughout workflow lifecycle
 * Established at execution start and propagated to sub-workflows/error workflows
 */
export type IExecutionContext = z.output<typeof ExecutionContextSchema>;

/**
 * The subset of a failed run's context that an error workflow may inherit.
 *
 * An error workflow reports a failure; it does not continue the failed run's
 * session. So it must not act as that run's user: the failing workflow names its
 * handler in `settings.errorWorkflow`, and whoever can write that setting would
 * otherwise choose which workflow gets to borrow the identity.
 *
 * Built as an allow-list rather than by deleting known-secret keys, so a field
 * added to `IExecutionContext` later has to be listed here before it can cross
 * the boundary.
 */
export function toErrorWorkflowContext(context: IExecutionContext): IExecutionContext;
export function toErrorWorkflowContext(
	context: IExecutionContext | undefined,
): IExecutionContext | undefined;
export function toErrorWorkflowContext(
	context: IExecutionContext | undefined,
): IExecutionContext | undefined {
	if (!context) return undefined;

	return {
		version: context.version,
		establishedAt: context.establishedAt,
		source: context.source,
		...(context.triggerNode !== undefined && { triggerNode: context.triggerNode }),
		...(context.parentExecutionId !== undefined && {
			parentExecutionId: context.parentExecutionId,
		}),
		...(context.redaction !== undefined && { redaction: context.redaction }),
		...(context.executedByUserId !== undefined && {
			executedByUserId: context.executedByUserId,
		}),
		...(context.usesDynamicCredentials !== undefined && {
			usesDynamicCredentials: context.usesDynamicCredentials,
		}),
	};
}

/**
 * Metadata shape for the `n8n-oauth` credential-context source.
 *
 * `subject` (the resolved n8n user id) and `executionPath` (the execution ids the
 * seal is valid for) turn the carrier into a verify-once "sealed" identity: when a
 * subject is present, resolution trusts it and binds to `executionPath` instead of
 * re-verifying the stored token. Absent `subject` = the legacy token-verify carrier;
 * `establishedAt`/`executionPath` are optional so those legacy carriers still parse.
 *
 * `grant` (see {@link OAuthResourceGrant}) is the gate that admitted the caller. A run
 * uses it to re-take that decision after the protected resource stops resolving.
 *
 * `version: 2` marks a seal made at admission. Such a seal always carries `grant`.
 * An absent `version` marks a legacy seal, where `grant` can be absent. Any other
 * `version`, or a `version: 2` seal without a grant, fails to parse.
 *
 * `binding` names the `trusted_source_identity` row (`sourceId`, `subject`) the caller
 * was admitted through, so every resolve re-checks that the binding is still active.
 *
 * This is the only schema for this shape: `maybeBindExecutionId` parses with it before
 * it re-encrypts, and `N8NIdentifier` parses with it before it resolves.
 */
const N8NOAuthMetadataBaseSchema = z.object({
	source: z.literal('n8n-oauth'),
	resource: z.string(),
	/**
	 * The resolved n8n user, sealed at establishment. When present, resolution trusts it
	 * (bound to `executionPath`, principal re-checked) instead of re-verifying the token.
	 * Absent on legacy / grant-only carriers, which fall back to token verification.
	 */
	subject: z.string().optional(),
	establishedAt: z.number().optional(),
	executionPath: z.array(z.string()).optional(),
	/** The `trusted_source_identity` row the caller came through; re-checked on every resolve. */
	binding: z.object({ sourceId: z.string(), subject: z.string() }).optional(),
});

/** A seal made at admission. It always carries the grant that admitted the caller. */
const N8NOAuthMetadataV2Schema = N8NOAuthMetadataBaseSchema.extend({
	version: z.literal(2),
	grant: OAuthResourceGrantSchema,
});

/**
 * A seal made before grants were required, so `grant` can be absent. Remove this schema,
 * and the legacy path in `N8NIdentifier`, when no legacy seals remain.
 */
const LegacyN8NOAuthMetadataSchema = N8NOAuthMetadataBaseSchema.extend({
	version: z.undefined(),
	grant: OAuthResourceGrantSchema.optional(),
});

export const N8NOAuthMetadataSchema = z.discriminatedUnion('version', [
	N8NOAuthMetadataV2Schema,
	LegacyN8NOAuthMetadataSchema,
]);

export type IN8NOAuthMetadata = z.output<typeof N8NOAuthMetadataSchema>;

/**
 * Runtime representation of execution context with decrypted credential data.
 *
 * This type is identical to IExecutionContext except the `credentials` field
 * contains the decrypted ICredentialContext object instead of an encrypted string.
 *
 * **Usage contexts:**
 * - Hook execution: Hooks work with plaintext context to extract/merge credential data
 * - Credential resolution: Resolvers need decrypted identity tokens
 * - Internal processing: Runtime operations that need access to credential context
 *
 * **Security notes:**
 * - Never persist this type to database - use IExecutionContext with encrypted credentials
 * - Never expose in API responses or logs
 * - Only exists in-memory during workflow execution
 * - Should be cleared from memory after use
 *
 * **Lifecycle:**
 * 1. Load IExecutionContext from storage (credentials encrypted)
 * 2. Decrypt credentials field → PlaintextExecutionContext (runtime only)
 * 3. Use for hook execution, credential resolution, etc.
 * 4. Encrypt credentials → IExecutionContext before persistence
 *
 * @see IExecutionContext - Persisted form with encrypted credentials
 * @see ICredentialContext - Decrypted credential structure
 * @see IExecutionContextUpdate - Partial updates during hook execution
 *
 * @example
 * ```typescript
 * // During hook execution:
 * const plaintextContext: PlaintextExecutionContext = {
 *   ...context,
 *   credentials: decryptCredentials(context.credentials) // Decrypt for runtime use
 * };
 *
 * // Hook can now access plaintext credential data
 * const identity = plaintextContext.credentials?.identity;
 *
 * // Before storage, re-encrypt:
 * const storableContext: IExecutionContext = {
 *   ...plaintextContext,
 *   credentials: encryptCredentials(plaintextContext.credentials)
 * };
 * ```
 */
export type PlaintextExecutionContext = Omit<
	IExecutionContext,
	'credentials' | 'secureArtifacts'
> & {
	credentials?: ICredentialContext;
	secureArtifacts?: ISecureArtifacts;
};

export const safeParse = <T extends ZodType>(value: string | object, schema: T) => {
	const typeName = schema.meta()?.title ?? 'Object';
	try {
		const normalizedObject = typeof value === 'string' ? jsonParse(value) : value;
		const parseResult = schema.safeParse(normalizedObject);
		if (parseResult.error) {
			throw parseResult.error;
		}
		// here we could implement a mgiration policy for migrating old execution context versions to newer ones
		return parseResult.data;
	} catch (error) {
		throw new Error(`Failed to parse to valid ${typeName}`, {
			cause: error,
		});
	}
};

/**
 * Safely parses an execution context from an
 * @param obj
 * @returns
 */
export const toExecutionContext = (value: string | object): IExecutionContext => {
	// here we could implement a mgiration policy for migrating old execution context versions to newer ones
	return safeParse(value, ExecutionContextSchema);
};

/**
 * Safely parses a credential context from either an object or a string to an
 * ICredentialContext. This can be used to safely parse a decrypted context for
 * example.
 * @param value The object or string to be parsed
 * @returns ICredentialContext
 * @throws Error in case parsing fails for any reason
 */
export const toCredentialContext = (value: string | object): ICredentialContext => {
	// here we could implement a mgiration policy for migrating old credential context versions to newer ones
	return safeParse(value, CredentialContextSchema);
};

export const toSecureArtifacts = (value: string | object): ISecureArtifacts => {
	// here we could implement a migration policy for migrating old secure artifacts versions to newer ones
	return safeParse(value, SecureArtifactsSchema);
};
