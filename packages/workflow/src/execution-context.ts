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
	 * - Outer key: source node name.
	 * - Inner array is parallel to the trigger items array — index `i`
	 *   corresponds to `triggerItems[i]`.
	 * - Each per-item map is keyed by the extraction path; values are the
	 *   leaf data extracted from that item.
	 */
	artifacts: z.record(z.string(), z.array(z.record(z.string(), JsonValueSchema))),

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
	redaction: RedactionSettingSchemaV1.optional(),
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
