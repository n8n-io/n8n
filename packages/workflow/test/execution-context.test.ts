import { toExecutionContext, toVerifiedClaim } from '../src/execution-context';

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

describe('toExecutionContext — claims', () => {
	const baseContext = {
		version: 1 as const,
		establishedAt: 1234567890,
		source: 'webhook' as const,
	};

	it('parses a context with a sealed (opaque, encrypted-string) claims field', () => {
		const parsed = toExecutionContext({ ...baseContext, claims: 'encrypted-blob' });

		expect(parsed.claims).toBe('encrypted-blob');
	});

	it('parses a context without a claims field without throwing (absent on old executions)', () => {
		expect(() => toExecutionContext({ ...baseContext })).not.toThrow();
		expect(toExecutionContext({ ...baseContext }).claims).toBeUndefined();
	});
});

describe('toVerifiedClaim', () => {
	const baseClaim = {
		version: 1 as const,
		sourceId: 'idp-1',
		subject: 'user-42',
		audience: 'aud-1',
		expiresAt: 1234567890,
		boundWorkflowId: 'wf-1',
	};

	it('parses a valid V1 claim without an actorClaim', () => {
		const parsed = toVerifiedClaim(baseClaim);

		expect(parsed).toEqual(baseClaim);
		expect(parsed.actorClaim).toBeUndefined();
	});

	it('parses a valid V1 claim with an actorClaim (On-Behalf-Of)', () => {
		const claim = {
			...baseClaim,
			actorClaim: { version: 1 as const, sourceId: 'idp-2', subject: 'service-account-1' },
		};

		const parsed = toVerifiedClaim(claim);

		expect(parsed.actorClaim).toEqual({
			version: 1,
			sourceId: 'idp-2',
			subject: 'service-account-1',
		});
	});

	it('round-trips through a JSON string, as it would after decrypt', () => {
		const parsed = toVerifiedClaim(JSON.stringify(baseClaim));

		expect(parsed).toEqual(baseClaim);
	});

	it.each(['sourceId', 'subject', 'audience', 'expiresAt', 'boundWorkflowId'])(
		'rejects a claim missing %s',
		(field) => {
			const invalid: Record<string, unknown> = { ...baseClaim };
			delete invalid[field];

			expect(() => toVerifiedClaim(invalid)).toThrow();
		},
	);

	it('rejects a claim with an unknown version', () => {
		expect(() => toVerifiedClaim({ ...baseClaim, version: 2 })).toThrow();
	});

	it('rejects a claim with a malformed actorClaim', () => {
		expect(() =>
			toVerifiedClaim({ ...baseClaim, actorClaim: { version: 1, sourceId: 'idp-2' } }),
		).toThrow();
	});

	it('strips an injected principal id rather than carrying it through', () => {
		// Simulates a forged/injected principalId on the raw (pre-parse) input -
		// the schema has no such field, so it must be dropped, not echoed back.
		const tampered = { ...baseClaim, principalId: 'admin', principal: 'admin' };

		const parsed = toVerifiedClaim(tampered);

		expect(parsed).not.toHaveProperty('principalId');
		expect(parsed).not.toHaveProperty('principal');
	});
});
