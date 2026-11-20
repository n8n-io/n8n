import type { INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { Writable } from 'node:stream';
import pgPromise from 'pg-promise';

import {
	copyRows,
	getFailedItemIndex,
	groupRows,
	toCopyField,
	type CopyRow,
} from '../../v2/helpers/copy';
import type { PgpDatabase } from '../../v2/helpers/interfaces';

const { copyFailures } = vi.hoisted(() => ({ copyFailures: [] as Array<Error | undefined> }));

vi.mock('pg-copy-streams', () => ({
	from: () => {
		const failure = copyFailures.shift();
		return Object.assign(
			new Writable({
				write: (_chunk, _encoding, callback) => callback(),
				final: (callback) => callback(failure),
			}),
			{ rowCount: 1 },
		);
	},
}));

const pgp = pgPromise();

const row = (itemIndex: number, item: CopyRow['item'], table = 'users'): CopyRow => ({
	itemIndex,
	schema: 'public',
	table,
	item,
});

describe('Postgres COPY', () => {
	describe('toCopyField', () => {
		it.each([
			['NULL', null, '\\N'],
			['undefined', undefined, '\\N'],
			['empty text', '', ''],
			['the text \\N', '\\N', '\\\\N'],
			['newline, carriage return and tab', 'a\nb\r\nc\td', 'a\\nb\\r\\nc\\td'],
			['backslash', 'C:\\temp', 'C:\\\\temp'],
			['number', 1.5, '1.5'],
			['boolean', false, 'false'],
			['object', { a: [1, 'x'] }, '{"a":[1,"x"]}'],
			['array', [1, 2], '[1,2]'],
			['buffer', Buffer.from('ab'), '\\\\x6162'],
		])('writes %s', (_, value, expected) => {
			expect(toCopyField(pgp, value)).toBe(expected);
		});

		it('writes a date like the INSERT path does', () => {
			const date = new Date('2026-01-02T03:04:05.006Z');
			expect(toCopyField(pgp, date)).toBe(pgp.as.date(date, true));
		});
	});

	describe('groupRows', () => {
		it('groups rows by table and by the set of fields', () => {
			const groups = groupRows([
				row(0, { id: 1, name: 'a' }),
				row(1, { id: 2 }),
				row(2, { name: 'c', id: 3 }),
				row(3, { id: 4 }, 'teams'),
			]);

			expect(
				groups.map(({ table, columns, rows }) => [table, columns, rows.map((r) => r.itemIndex)]),
			).toEqual([
				['users', ['id', 'name'], [0, 2]],
				['users', ['id'], [1]],
				['teams', ['id'], [3]],
			]);
		});
	});

	describe('getFailedItemIndex', () => {
		const [group] = groupRows([row(4, { id: 1 }), row(7, { id: 2 })]);

		it.each([
			['the COPY line', 'COPY users, line 2, column id: "x"', 7],
			[
				'the COPY line after a trigger frame',
				'PL/pgSQL function public.check() line 1 at RAISE\nCOPY users, line 2: "2"',
				7,
			],
			[
				'a context without a COPY frame',
				'PL/pgSQL function public.check() line 1 at RAISE',
				undefined,
			],
			['a line past the last row', 'COPY users, line 3', undefined],
			['no context', undefined, undefined],
		])('reads %s', (_, where, expected) => {
			expect(getFailedItemIndex(Object.assign(new Error('failed'), { where }), group)).toBe(
				expected,
			);
		});
	});

	describe('copyRows', () => {
		it('rolls back the transaction and names the item when a later COPY fails', async () => {
			const connection = {
				none: vi.fn(async () => null),
				done: vi.fn(),
				client: { query: vi.fn() },
			};
			const db = { connect: vi.fn(async () => connection) } as unknown as PgpDatabase;
			copyFailures.push(
				undefined,
				Object.assign(new Error('invalid input syntax for type integer: "x"'), {
					where: 'COPY users, line 1, column id',
				}),
			);

			const error = await copyRows({ name: 'Postgres' } as INode, db, pgp, [
				row(0, { id: 1, name: 'a' }),
				row(1, { id: 'x' }),
			]).catch((e: unknown) => e);

			expect(error).toBeInstanceOf(NodeOperationError);
			expect(error).toMatchObject({ context: { itemIndex: 1 } });
			expect(connection.none.mock.calls).toEqual([['BEGIN'], ['ROLLBACK']]);
			expect(connection.done).toHaveBeenCalled();
		});
	});
});
