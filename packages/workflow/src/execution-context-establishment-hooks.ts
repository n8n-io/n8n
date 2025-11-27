import z from 'zod/v4';

const ExecutionContextEstablishmentHookParameterSchemaV1 = z.object({
	executionsHooksVersion: z.literal(1),
	hooks: z.array(
		z
			.object({
				hookName: z.string(),
				isAllowedToFail: z.boolean().optional().default(false),
			})
			.loose(),
	),
});

export type ExecutionContextEstablishmentHookParameterV1 = z.output<
	typeof ExecutionContextEstablishmentHookParameterSchemaV1
>;

export const ExecutionContextEstablishmentHookParameterSchema = z
	.discriminatedUnion('contextEstablishmentHooks.executionsHooksVersion', [
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
	return ExecutionContextEstablishmentHookParameterSchema.safeParse(value);
};
