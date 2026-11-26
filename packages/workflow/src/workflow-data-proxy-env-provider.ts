import { ExpressionError } from './errors/expression.error';

export type EnvProviderState = {
	isProcessAvailable: boolean;
	isEnvAccessBlocked: boolean;
	env: Record<string, string>;
};

/**
 * Parses the optional `N8N_ENV_ACCESS_ALLOWLIST` (comma-separated list of
 * environment variable names). When set, ONLY these variables are exposed to
 * expressions/Code nodes via `$env`, regardless of the value of
 * `N8N_BLOCK_ENV_ACCESS_IN_NODE`.
 *
 * This is the least-privilege alternative to the all-or-nothing
 * `N8N_BLOCK_ENV_ACCESS_IN_NODE=false`: it lets an operator expose a single
 * value (e.g. an API token) to workflows without also exposing sensitive
 * variables such as `N8N_ENCRYPTION_KEY`.
 */
function getEnvAccessAllowlist(): string[] {
	return (process.env.N8N_ENV_ACCESS_ALLOWLIST ?? '')
		.split(',')
		.map((name) => name.trim())
		.filter((name) => name.length > 0);
}

/**
 * Captures a snapshot of the environment variables and configuration
 * that can be used to initialize an environment provider.
 */
export function createEnvProviderState(): EnvProviderState {
	const isProcessAvailable = typeof process !== 'undefined';
	if (!isProcessAvailable) {
		return { isProcessAvailable: false, isEnvAccessBlocked: false, env: {} };
	}

	// An allowlist, when present, takes precedence: it grants access to exactly
	// the named variables (and nothing else), even when env access would
	// otherwise be blocked. Access is therefore "not blocked" but scoped — the
	// snapshot only contains the allowlisted keys, so every other variable
	// resolves to `undefined` just like a non-existent one.
	const allowlist = getEnvAccessAllowlist();
	if (allowlist.length > 0) {
		const env: Record<string, string> = {};
		for (const name of allowlist) {
			const value = process.env[name];
			if (value !== undefined) env[name] = value;
		}
		return { isProcessAvailable: true, isEnvAccessBlocked: false, env };
	}

	const isEnvAccessBlocked = process.env.N8N_BLOCK_ENV_ACCESS_IN_NODE !== 'false';
	const env: Record<string, string> = isEnvAccessBlocked
		? {}
		: (process.env as Record<string, string>);

	return {
		isProcessAvailable: true,
		isEnvAccessBlocked,
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
							'If you need access please contact the administrator to remove the environment variable ‘N8N_BLOCK_ENV_ACCESS_IN_NODE‘ (or expose selected variables with ‘N8N_ENV_ACCESS_ALLOWLIST‘)',
						runIndex,
						itemIndex,
					});
				}

				return providerState.env[name.toString()];
			},
		},
	);
}
