import type { IExecuteFunctions, INode } from 'n8n-workflow';

const TIMESTAMP_OID = 1114;

const { pgpMock, capturedConfig } = vi.hoisted(() => {
	const capturedConfig: Array<Record<string, unknown>> = [];
	const pgp = Object.assign(
		vi.fn((config: Record<string, unknown>) => {
			capturedConfig.push(config);
			return { $pool: { end: vi.fn() } };
		}),
		{ pg: { types: { builtins: { DATE: 1082, TIMESTAMP: 1114, TIMESTAMPTZ: 1184 } } } },
	);
	return { pgpMock: vi.fn(() => pgp), capturedConfig };
});

vi.mock('pg-promise', () => ({ default: pgpMock }));
vi.mock('../../Postgres/v1/genericFunctions', () => ({
	pgInsert: vi.fn(),
	pgQueryV2: vi.fn().mockResolvedValue([]),
	pgUpdate: vi.fn(),
}));

import { TimescaleDb } from '../TimescaleDb.node';

const runAt = async (typeVersion: number) => {
	const ctx = {
		getCredentials: vi.fn().mockResolvedValue({ host: 'localhost', port: 5432, ssl: 'disable' }),
		getNode: vi.fn().mockReturnValue({ typeVersion } as INode),
		getInputData: vi.fn().mockReturnValue([]),
		getNodeParameter: vi.fn().mockReturnValue('executeQuery'),
		continueOnFail: vi.fn().mockReturnValue(false),
		helpers: { returnJsonArray: vi.fn().mockReturnValue([]) },
	} as unknown as IExecuteFunctions;

	await new TimescaleDb().execute.call(ctx);

	const types = capturedConfig.at(-1)?.types as
		| { getTypeParser: (id: number, format?: 'text') => (value: string) => unknown }
		| undefined;

	return types?.getTypeParser(TIMESTAMP_OID, 'text');
};

describe('TimescaleDb node', () => {
	beforeEach(() => {
		capturedConfig.length = 0;
	});

	it('offers 1.3 and makes it the default for a new node', () => {
		const { version } = new TimescaleDb().description;

		expect(version).toEqual([1, 1.1, 1.2, 1.3]);
		expect([version].flat().at(-1)).toBe(1.3);
	});

	describe('timestamp without time zone', () => {
		const wireValue = '2026-03-14 01:59:26.535897';
		const asUtcInstant = new Date(wireValue).toISOString();

		it.each([
			[1, undefined],
			[1.1, asUtcInstant],
			[1.2, asUtcInstant],
			[1.3, '2026-03-14T01:59:26.535897'],
		])('reads %s as %s', async (typeVersion, expected) => {
			const parse = await runAt(typeVersion);

			expect(parse?.(wireValue)).toBe(expected);
		});
	});
});
