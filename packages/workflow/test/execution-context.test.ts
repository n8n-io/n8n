import {
	toErrorWorkflowContext,
	toExecutionContext,
	type IExecutionContext,
} from '../src/execution-context';

describe('toExecutionContext — redaction snapshot', () => {
	const baseContext = {
		version: 1 as const,
		establishedAt: 1234567890,
		source: 'webhook' as const,
	};

	it('parses a V1 redaction snapshot (legacy policy enum)', () => {
		const parsed = toExecutionContext({
			...baseContext,
			redaction: { version: 1, policy: 'all' },
		});

		expect(parsed.redaction).toEqual({ version: 1, policy: 'all' });
	});

	it('parses a V2 redaction snapshot (per-channel booleans)', () => {
		const parsed = toExecutionContext({
			...baseContext,
			redaction: { version: 2, production: true, manual: false },
		});

		expect(parsed.redaction).toEqual({ version: 2, production: true, manual: false });
	});

	it('parses a V2 redaction snapshot with source attribution', () => {
		const parsed = toExecutionContext({
			...baseContext,
			redaction: { version: 2, production: true, manual: false, source: 'instance' },
		});

		expect(parsed.redaction).toEqual({
			version: 2,
			production: true,
			manual: false,
			source: 'instance',
		});
	});

	it('rejects an unknown source value', () => {
		expect(() =>
			toExecutionContext({
				...baseContext,
				redaction: { version: 2, production: true, manual: false, source: 'project' },
			}),
		).toThrow();
	});

	it('parses a context without a redaction snapshot', () => {
		const parsed = toExecutionContext({ ...baseContext });

		expect(parsed.redaction).toBeUndefined();
	});

	it('rejects a redaction snapshot with an unknown version', () => {
		expect(() =>
			toExecutionContext({
				...baseContext,
				redaction: { version: 3, production: true, manual: true },
			}),
		).toThrow();
	});

	it('rejects a V2 snapshot missing a channel', () => {
		expect(() =>
			toExecutionContext({
				...baseContext,
				redaction: { version: 2, production: true },
			}),
		).toThrow();
	});
});

describe('toErrorWorkflowContext', () => {
	const fullContext: IExecutionContext = {
		version: 1,
		establishedAt: 1234567890,
		source: 'webhook',
		triggerNode: { name: 'Webhook', type: 'n8n-nodes-base.webhook' },
		parentExecutionId: 'parent-1',
		credentials: 'encrypted-identity-carrier',
		secureArtifacts: 'encrypted-secure-artifacts',
		redaction: { version: 2, production: true, manual: false },
		executedByUserId: 'user-1',
		usesDynamicCredentials: true,
	};

	it('drops the identity carrier and the secure artifacts', () => {
		const result = toErrorWorkflowContext(fullContext);

		expect(result).not.toHaveProperty('credentials');
		expect(result).not.toHaveProperty('secureArtifacts');
	});

	it('keeps the fields the error execution needs for its own record', () => {
		expect(toErrorWorkflowContext(fullContext)).toEqual({
			version: 1,
			establishedAt: 1234567890,
			source: 'webhook',
			triggerNode: { name: 'Webhook', type: 'n8n-nodes-base.webhook' },
			parentExecutionId: 'parent-1',
			redaction: { version: 2, production: true, manual: false },
			executedByUserId: 'user-1',
			usesDynamicCredentials: true,
		});
	});

	it('carries no key that the allow-list does not name', () => {
		// The point of the allow-list: a field added to IExecutionContext must be
		// listed before it can reach an error workflow. A deny-list would leak it.
		const withUnknownField = {
			...fullContext,
			someFutureSecret: 'must-not-cross',
		} as IExecutionContext;

		expect(toErrorWorkflowContext(withUnknownField)).not.toHaveProperty('someFutureSecret');
	});

	it('omits optional fields the parent did not set, rather than setting them undefined', () => {
		const result = toErrorWorkflowContext({
			version: 1,
			establishedAt: 1234567890,
			source: 'trigger',
		});

		expect(Object.keys(result!)).toEqual(['version', 'establishedAt', 'source']);
	});

	it('keeps `usesDynamicCredentials: false` rather than dropping it', () => {
		const result = toErrorWorkflowContext({ ...fullContext, usesDynamicCredentials: false });

		expect(result).toHaveProperty('usesDynamicCredentials', false);
	});

	it('returns undefined when there is no context', () => {
		expect(toErrorWorkflowContext(undefined)).toBeUndefined();
	});

	it('produces a context that still parses as an execution context', () => {
		expect(() => toExecutionContext(toErrorWorkflowContext(fullContext)!)).not.toThrow();
	});
});
