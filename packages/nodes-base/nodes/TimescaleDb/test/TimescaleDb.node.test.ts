import type { IExecuteFunctions, INode } from 'n8n-workflow';

const { pgpMock, capturedConfig } = vi.hoisted(() => {
	const capturedConfig: Array<Record<string, unknown>> = [];
	const pgp = Object.assign(
		vi.fn((config: Record<string, unknown>) => {
			capturedConfig.push(config);
			return { $pool: { end: vi.fn() } };
		}),
		{
			end: vi.fn(),
			pg: { types: { builtins: { DATE: 1082, TIMESTAMP: 1114, TIMESTAMPTZ: 1184 } } },
		},
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

/** The parser the connection would hand a `timestamp without time zone` column. */
const timestampParser = () => {
	const types = capturedConfig.at(-1)?.types as {
		getTypeParser: (id: number, format?: 'text') => (value: string) => unknown;
	};
	expect(types, 'the connection set no type parsers').toBeDefined();
	return types.getTypeParser(1114, 'text');
};

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
};

describe('TimescaleDb node', () => {
	beforeEach(() => {
		capturedConfig.length = 0;
	});

	describe('timestamp without time zone', () => {
		// The column carries no offset, so the wire value is the whole truth. Reading it as an
		// instant invents a zone and makes the output follow the n8n host's own.
		const wireValue = '2026-03-14 01:59:26.535897';

		it('keeps the older reading on 1.2, so an existing workflow sees no change', async () => {
			await runAt(1.2);

			expect(timestampParser()(wireValue)).toBe(new Date(wireValue).toISOString());
		});

		it('returns the value the server sent on 1.3, to the digit', async () => {
			await runAt(1.3);

			expect(timestampParser()(wireValue)).toBe('2026-03-14T01:59:26.535897');
		});

		it('sets no type parsers at all on 1, as it always has', async () => {
			await runAt(1);

			expect(capturedConfig.at(-1)?.types).toBeUndefined();
		});
	});
});
