import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import {
	addCursorPredicate,
	assertCursorColumnType,
	getStartAfter,
	mysqlCursorPredicate,
} from '../sql-keyset-paging';

const node = mock<INode>({ name: 'Test Node' });
const ctxWith = (startAfter: unknown) =>
	({ getNode: () => node, getNodeParameter: () => startAfter }) as unknown as IExecuteFunctions;

describe('getStartAfter', () => {
	it.each([
		['no Start After', null, undefined],
		['a number', { column: 'id', value: 5 }, { column: 'id', value: '5' }],
		['zero', { column: 'id', value: 0 }, { column: 'id', value: '0' }],
		['the text 0', { column: 'id', value: '0' }, { column: 'id', value: '0' }],
		['an empty value', { column: 'id', value: '' }, { column: 'id' }],
		['a null value', { column: 'id', value: null }, { column: 'id' }],
	])('reads %s', (_, startAfter, expected) => {
		expect(getStartAfter(ctxWith(startAfter), 0)).toEqual(expected);
	});

	it.each([
		['a value without a column', { column: '', value: '5' }, 'Choose a column in Start After'],
		[
			'an object value',
			{ column: 'id', value: { a: 1 } },
			'The Start After value must be text or a number',
		],
		[
			'a number that is too big',
			{ column: 'id', value: 2 ** 53 },
			'The Start After value is too big to be exact',
		],
	])('throws for %s', (_, startAfter, message) => {
		expect(() => getStartAfter(ctxWith(startAfter), 0)).toThrow(message);
	});
});

describe('addCursorPredicate', () => {
	it('adds WHERE when the query has no conditions', () => {
		expect(addCursorPredicate('SELECT * FROM t', 'SELECT * FROM t', 'id > ?')).toBe(
			'SELECT * FROM t WHERE id > ?',
		);
	});

	it('wraps the existing conditions', () => {
		expect(
			addCursorPredicate('SELECT * FROM t', 'SELECT * FROM t WHERE a = 1 OR b = 2', 'id > ?'),
		).toBe('SELECT * FROM t WHERE (a = 1 OR b = 2) AND id > ?');
	});
});

describe('mysqlCursorPredicate', () => {
	it.each([
		['`id`', 'int', '`id` > CAST(? AS DECIMAL(65, 0))'],
		['`id`', 'bigint unsigned', '`id` > CAST(? AS DECIMAL(65, 0))'],
		['`price`', 'decimal(10,2)', '`price` > CAST(? AS DECIMAL(10, 2))'],
		['`price`', 'decimal(10,2) unsigned', '`price` > CAST(? AS DECIMAL(10, 2))'],
		['`code`', 'varchar(64)', '`code` > ?'],
		['`created`', 'datetime', '`created` > ?'],
	])(
		'binds a %s %s cursor so MySQL does not compare it as a double',
		(columnSql, columnType, expected) => {
			expect(mysqlCursorPredicate(columnSql, '>', columnType)).toBe(expected);
		},
	);

	it('uses the descending operator', () => {
		expect(mysqlCursorPredicate('`id`', '<', 'bigint')).toBe('`id` < CAST(? AS DECIMAL(65, 0))');
	});
});

describe('assertCursorColumnType', () => {
	it('throws only for a type that is not supported', () => {
		expect(() => assertCursorColumnType(node, 0, 'id', 'int', /^int$/)).not.toThrow();
		expect(() => assertCursorColumnType(node, 0, 'at', 'datetime', /^int$/)).toThrow(
			'Start After does not support the column "at" of type datetime',
		);
	});
});
