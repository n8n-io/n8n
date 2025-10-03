import { ExpressionError } from '../src/errors/expression.error';
import { createEnvProvider, createEnvProviderState } from '../src/workflow-data-proxy-env-provider';

describe('createEnvProviderState', () => {
	afterEach(() => {
		delete process.env.N8N_BLOCK_ENV_ACCESS_IN_NODE;
	});

	it('should return the state with process available and env access allowed', () => {
		expect(createEnvProviderState()).toEqual({
			isProcessAvailable: true,
			isEnvAccessBlocked: false,
			env: process.env,
		});
	});

	it('should block env access when N8N_BLOCK_ENV_ACCESS_IN_NODE is set to "true"', () => {
		process.env.N8N_BLOCK_ENV_ACCESS_IN_NODE = 'true';

		expect(createEnvProviderState()).toEqual({
			isProcessAvailable: true,
			isEnvAccessBlocked: true,
			env: {},
		});
	});

	it('should handle process not being available', () => {
		const originalProcess = global.process;
		try {
			// @ts-expect-error process is read-only
			global.process = undefined;

			expect(createEnvProviderState()).toEqual({
				isProcessAvailable: false,
				isEnvAccessBlocked: false,
				env: {},
			});
		} finally {
			global.process = originalProcess;
		}
	});
});

describe('createEnvProvider', () => {
	it('should return true when checking for a property using "has"', () => {
		const proxy = createEnvProvider(0, 0, createEnvProviderState());
		expect('someProperty' in proxy).toBe(true);
	});

	it('should return the value from process.env if access is allowed', () => {
		process.env.TEST_ENV_VAR = 'test_value';
		const proxy = createEnvProvider(0, 0, createEnvProviderState());
		expect(proxy.TEST_ENV_VAR).toBe('test_value');
	});

	it('should throw ExpressionError when process is unavailable', () => {
		vi.useFakeTimers({ now: new Date() });

		const originalProcess = global.process;
		try {
			// @ts-expect-error process is read-only
			global.process = undefined;
			const proxy = createEnvProvider(1, 1, createEnvProviderState());

			expect(() => proxy.someEnvVar).toThrowError(
				new ExpressionError('not accessible via UI, please run node', {
					runIndex: 1,
					itemIndex: 1,
				}),
			);
		} finally {
			global.process = originalProcess;
			vi.useRealTimers();
		}
	});

	it('should throw ExpressionError when env access is blocked', () => {
		vi.useFakeTimers({ now: new Date() });

		try {
			process.env.N8N_BLOCK_ENV_ACCESS_IN_NODE = 'true';
			const proxy = createEnvProvider(1, 1, createEnvProviderState());

			expect(() => proxy.someEnvVar).toThrowError(
				new ExpressionError('access to env vars denied', {
					causeDetailed:
						'If you need access please contact the administrator to remove the environment variable ‘N8N_BLOCK_ENV_ACCESS_IN_NODE‘',
					runIndex: 1,
					itemIndex: 1,
				}),
			);
		} finally {
			vi.useRealTimers();
		}
	});
});
