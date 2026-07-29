import z from 'zod/v4';

const ExecutionContextEstablishmentHookParameterSchemaV1 = z.object({
	executionsHooksVersion: z.literal(1),
	contextEstablishmentHooks: z.object({
		hooks: z
			.array(
				z
					.object({
						hookName: z.string(),
						isAllowedToFail: z.boolean().optional().default(false),
					})
					.loose(),
			)
			.optional()
			.default([]),
	}),
});

export type ExecutionContextEstablishmentHookParameterV1 = z.output<
	typeof ExecutionContextEstablishmentHookParameterSchemaV1
>;

export const ExecutionContextEstablishmentHookParameterSchema = z
	.discriminatedUnion('executionsHooksVersion', [
		ExecutionContextEstablishmentHookParameterSchemaV1,
	])
	.meta({
		title: 'ExecutionContextEstablishmentHookParameter',
	});

export type ExecutionContextEstablishmentHookParameter = z.output<
	typeof ExecutionContextEstablishmentHookParameterSchema
>;

/**
 * Safely parses an execution context establishment hook parameters
 * @param obj
 * @returns
 */
export const toExecutionContextEstablishmentHookParameter = (value: unknown) => {
	if (value === null || value === undefined || typeof value !== 'object') {
		return null;
	}
	// `executionsHooksVersion` is a hidden node property defaulting to 1, so it is
	// stripped from saved workflows and absent from the raw parameters read here.
	// Recognize the hooks by their own key and default the version to 1 (the only
	// version) when it's missing; bail only when neither key is present.
	if (!('executionsHooksVersion' in value) && !('contextEstablishmentHooks' in value)) {
		return null;
	}
	const normalized =
		'executionsHooksVersion' in value ? value : { ...value, executionsHooksVersion: 1 };
	return ExecutionContextEstablishmentHookParameterSchema.safeParse(normalized);
};
