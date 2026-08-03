import { toExecutionContext } from '../src/execution-context';

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
