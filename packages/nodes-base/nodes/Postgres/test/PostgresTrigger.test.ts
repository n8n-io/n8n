import type { IDataObject, ITriggerFunctions } from 'n8n-workflow';
import pgPromise from 'pg-promise';

import {
	pgTriggerFunction,
	prepareNames,
	validatePostgresIdentifier,
} from '../PostgresTrigger.functions';
import { PostgresTrigger } from '../PostgresTrigger.node';
import { configurePostgres } from '../transport';

vi.mock('../transport', () => ({ configurePostgres: vi.fn() }));

const invalidIdentifiers = [
	'name; select 1',
	'name"',
	"name'",
	'name()',
	'name.other',
	'a-b',
	'1abc',
	'has space',
	'',
];

describe('validatePostgresIdentifier', () => {
	it.each(['n8n_channel', '_fn1', 'MyTrigger', 'a', 'x_1_y'])(
		'accepts the valid identifier %s',
		(name) => {
			expect(() => validatePostgresIdentifier(name, 'Channel name')).not.toThrow();
		},
	);

	it.each(invalidIdentifiers)('rejects the invalid identifier %j', (name) => {
		expect(() => validatePostgresIdentifier(name, 'Channel name')).toThrow(/Channel name must/);
	});
});

describe('prepareNames', () => {
	it('returns safe defaults when no names are provided', () => {
		const names = prepareNames('abc-123', 'trigger', {});
		expect(names.functionName).toBe('n8n_trigger_function_abc_123');
		expect(names.triggerName).toBe('n8n_trigger_abc_123');
		expect(names.channelName).toBe('n8n_channel_abc_123');
	});

	it('strips a trailing () from a provided function name', () => {
		const names = prepareNames('id1', 'trigger', { functionName: 'my_fn()' });
		expect(names.functionName).toBe('my_fn');
	});

	it.each([
		['channelName', { channelName: 'name; select 1' }],
		['functionName', { functionName: 'name(); select 1' }],
		['triggerName', { triggerName: 'name on t' }],
	])('rejects an invalid %s', (_field, additionalFields) => {
		expect(() => prepareNames('id1', 'trigger', additionalFields as IDataObject)).toThrow();
	});
});

describe('pgTriggerFunction', () => {
	const createContext = (params: IDataObject) => {
		const getNodeParameter = vi.fn((name: string, _i?: unknown, fallback?: unknown) =>
			name in params ? params[name] : fallback,
		);
		return { getNodeParameter } as unknown as ITriggerFunctions;
	};

	const invoke = (firesOn: string, additionalFields: IDataObject = { replaceIfExists: true }) => {
		const db = { any: vi.fn().mockResolvedValue([]) };
		const ctx = createContext({ schema: 'public', tableName: 'users', firesOn });
		const run = async () =>
			await pgTriggerFunction.call(
				ctx,
				db as never,
				additionalFields,
				'my_fn',
				'my_trigger',
				'my_channel',
			);
		const sqls = () => db.any.mock.calls.map(([sql]) => sql as string);
		return { db, run, sqls };
	};

	it('never emits a :raw modifier in any executed statement', async () => {
		const { db, run } = invoke('INSERT');
		await run();

		expect(db.any).toHaveBeenCalled();
		for (const [sql] of db.any.mock.calls) {
			expect(sql).not.toContain(':raw');
		}
	});

	it('produces templates pg-promise can format without error', async () => {
		const { db, run } = invoke('INSERT');
		await run();

		const pgp = pgPromise();
		for (const [sql, params] of db.any.mock.calls) {
			expect(() => pgp.as.format(sql as string, params)).not.toThrow();
		}
	});

	it('passes schema and table as separate identifier parameters', async () => {
		const { db, run } = invoke('INSERT');
		await run();

		const dropCall = db.any.mock.calls.find(([sql]) => (sql as string).includes('DROP TRIGGER'));
		expect(dropCall?.[1]).toEqual(['my_trigger', 'public', 'users']);
	});

	it('uses the OLD row record for DELETE triggers', async () => {
		const { run, sqls } = invoke('DELETE');
		await run();

		const notifySql = sqls().find((s) => s.includes('pg_notify'));
		expect(notifySql).toContain('row_to_json(OLD)');
	});

	it('embeds the validated event keyword in the trigger', async () => {
		const { run, sqls } = invoke('UPDATE');
		await run();

		const triggerSql = sqls().find((s) => s.includes('CREATE TRIGGER'));
		expect(triggerSql).toContain('AFTER UPDATE');
	});

	it('creates without OR REPLACE and skips the drop when a name is provided', async () => {
		const { run, sqls } = invoke('INSERT', { triggerName: 'my_trigger' });
		await run();

		expect(sqls().some((s) => s.startsWith('CREATE FUNCTION'))).toBe(true);
		expect(sqls().some((s) => s.startsWith('CREATE OR REPLACE FUNCTION'))).toBe(false);
		expect(sqls().some((s) => s.includes('DROP TRIGGER'))).toBe(false);
	});

	it('rejects an invalid firesOn event', async () => {
		const { run } = invoke('DROP');
		await expect(run()).rejects.toThrow();
	});
});

describe('PostgresTrigger.trigger (Table Row Change Events mode)', () => {
	const setup = (additionalFields: IDataObject = {}, firesOn = 'INSERT') => {
		const connection = {
			none: vi.fn().mockResolvedValue(undefined),
			any: vi.fn().mockResolvedValue([]),
			query: vi.fn().mockResolvedValue([]),
			done: vi.fn().mockResolvedValue(undefined),
			client: { on: vi.fn(), removeListener: vi.fn() },
		};
		const db = {
			connect: vi.fn().mockResolvedValue(connection),
			any: vi.fn().mockResolvedValue([]),
		};
		vi.mocked(configurePostgres).mockResolvedValue({ db, pgp: {} } as never);

		const params: IDataObject = {
			triggerMode: 'createTrigger',
			additionalFields,
			options: {},
			schema: 'public',
			tableName: 'users',
			firesOn,
		};
		const fns = {
			getNodeParameter: vi.fn((name: string, _i?: unknown, fallback?: unknown) =>
				name in params ? params[name] : fallback,
			),
			getCredentials: vi.fn().mockResolvedValue({}),
			getNode: vi.fn().mockReturnValue({ id: 'node-1' }),
			getMode: vi.fn().mockReturnValue('trigger'),
			emit: vi.fn(),
			helpers: { returnJsonArray: vi.fn((d: unknown) => d) },
		} as unknown as ITriggerFunctions;

		return { connection, db, fns };
	};

	it('creates the trigger objects without any :raw modifier', async () => {
		const { db, fns } = setup();
		await new PostgresTrigger().trigger.call(fns);

		expect(db.any).toHaveBeenCalled();
		for (const [sql] of db.any.mock.calls) {
			expect(sql).not.toContain(':raw');
		}
	});

	it('drops the created objects with matching identifiers on close', async () => {
		const { connection, fns } = setup();
		const response = await new PostgresTrigger().trigger.call(fns);
		await response.closeFunction?.();

		expect(connection.any).toHaveBeenCalledWith('DROP FUNCTION IF EXISTS $1:name CASCADE', [
			'n8n_trigger_function_node_1',
		]);
		expect(connection.any).toHaveBeenCalledWith(
			'DROP TRIGGER IF EXISTS $1:name ON $2:name.$3:name CASCADE',
			['n8n_trigger_node_1', 'public', 'users'],
		);
	});

	it('releases the connection when setup fails', async () => {
		const { connection, fns } = setup({}, 'INVALID');
		await expect(new PostgresTrigger().trigger.call(fns)).rejects.toThrow();
		expect(connection.done).toHaveBeenCalled();
	});
});

describe('PostgresTrigger.trigger (Advanced mode)', () => {
	const setup = (channelName: string) => {
		const connection = {
			none: vi.fn().mockResolvedValue(undefined),
			client: { on: vi.fn(), removeListener: vi.fn() },
		};
		const db = { connect: vi.fn().mockResolvedValue(connection) };
		vi.mocked(configurePostgres).mockResolvedValue({ db, pgp: {} } as never);

		const params: IDataObject = {
			triggerMode: 'listenTrigger',
			additionalFields: {},
			options: {},
			channelName,
		};
		const fns = {
			getNodeParameter: vi.fn((name: string, _i?: unknown, fallback?: unknown) =>
				name in params ? params[name] : fallback,
			),
			getCredentials: vi.fn().mockResolvedValue({}),
			getNode: vi.fn().mockReturnValue({ id: 'node-1' }),
			getMode: vi.fn().mockReturnValue('trigger'),
			emit: vi.fn(),
			helpers: { returnJsonArray: vi.fn((d: unknown) => d) },
		} as unknown as ITriggerFunctions;

		return { connection, db, fns };
	};

	it('listens via a parameterized identifier', async () => {
		const { connection, fns } = setup('my_channel');
		await new PostgresTrigger().trigger.call(fns);
		expect(connection.none).toHaveBeenCalledWith('LISTEN $1:name', ['my_channel']);
	});

	it('lower-cases the channel to match unquoted notifications', async () => {
		const { connection, fns } = setup('MyChannel');
		await new PostgresTrigger().trigger.call(fns);
		expect(connection.none).toHaveBeenCalledWith('LISTEN $1:name', ['mychannel']);
	});

	it('rejects an invalid channel before opening a connection', async () => {
		const { db, connection, fns } = setup('bad; select 1');
		await expect(new PostgresTrigger().trigger.call(fns)).rejects.toThrow(/Channel name must/);
		expect(db.connect).not.toHaveBeenCalled();
		expect(connection.none).not.toHaveBeenCalled();
	});
});

describe('pg-promise identifier and value formatting', () => {
	const pgp = pgPromise();

	it('wraps a :name identifier in a single double-quoted token', () => {
		const formatted = pgp.as.format('LISTEN $1:name', ['a"b']);
		expect(formatted).toBe('LISTEN "a""b"');
	});

	it('formats a bound value inside a dollar-quoted body as an escaped literal', () => {
		const formatted = pgp.as.format("AS $BODY$ begin perform pg_notify($1, 'x'); end; $BODY$", [
			"a'b",
		]);
		expect(formatted).toContain("pg_notify('a''b',");
		expect(formatted).toContain('$BODY$');
	});
});
