import z, { type ZodType } from 'zod/v4';

import { jsonParse } from './utils';

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

const ExecutionContextSchemaV1 = z.object({
	version: z.literal(1),
	/**
	 * When the context was established (Unix timestamp in milliseconds)
	 */
	establishedAt: z.number(),
	/**
	 * Encrypted credential context for dynamic credential resolution
	 * Always encrypted when stored, decrypted on-demand by credential resolver
	 * @see ICredentialContext for decrypted structure
	 */
	credentials: z.string().optional().meta({
		description:
			'Encrypted credential context for dynamic credential resolution Always encrypted when stored, decrypted on-demand by credential resolver @see ICredentialContext for decrypted structure',
	}),
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

const safeParse = <T extends ZodType>(value: string | object, schema: T) => {
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
