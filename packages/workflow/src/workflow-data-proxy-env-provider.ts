import { ExpressionError } from './errors/expression.error';

export type EnvProviderState = {
	isProcessAvailable: boolean;
	isEnvAccessBlocked: boolean;
	env: Record<string, string>;
};

/**
 * Captures a snapshot of the environment variables and configuration
 * that can be used to initialize an environment provider.
 *
 * @param isEnvAccessBlocked - Whether env access is blocked. If undefined,
 *   falls back to checking process.env.N8N_BLOCK_ENV_ACCESS_IN_NODE for
 *   backward compatibility.
 */
export function createEnvProviderState(isEnvAccessBlocked?: boolean): EnvProviderState {
	const isProcessAvailable = typeof process !== 'undefined';
	const envBlocked =
		isEnvAccessBlocked ??
		(isProcessAvailable ? process.env.N8N_BLOCK_ENV_ACCESS_IN_NODE !== 'false' : false);
	const env: Record<string, string> =
		!isProcessAvailable || envBlocked ? {} : (process.env as Record<string, string>);

	return {
		isProcessAvailable,
		isEnvAccessBlocked: envBlocked,
		env,
	};
}

/**
 * Creates a proxy that provides access to the environment variables
 * in the `WorkflowDataProxy`. Use the `createEnvProviderState` to
 * create the default state object that is needed for the proxy,
 * unless you need something specific.
 *
 * @example
 * createEnvProvider(
 *   runIndex,
 *   itemIndex,
 *   createEnvProviderState(),
 * )
 */
export function createEnvProvider(
	runIndex: number,
	itemIndex: number,
	providerState: EnvProviderState,
): Record<string, string> {
	return new Proxy(
		{},
		{
			has() {
				return true;
			},

			get(_, name) {
				if (name === 'isProxy') return true;

				if (!providerState.isProcessAvailable) {
					throw new ExpressionError('not accessible via UI, please run node', {
						runIndex,
						itemIndex,
					});
				}
				if (providerState.isEnvAccessBlocked) {
					throw new ExpressionError('access to env vars denied', {
						causeDetailed:
							'If you need access please contact the administrator to remove the environment variable ‘N8N_BLOCK_ENV_ACCESS_IN_NODE‘',
						runIndex,
						itemIndex,
					});
				}

				return providerState.env[name.toString()];
			},
		},
	);
}
