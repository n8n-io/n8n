import type { INodeProperties } from 'n8n-workflow';
import { NodeHelpers, READ_ONLY_ANNOTATIONS, resolveNodeAnnotations } from 'n8n-workflow';

import { optionsCollection } from '../../v2/actions/common.descriptions';
import { versionDescription } from '../../v2/actions/versionDescription';

/** The Query Parameters options that the editor shows for Execute Query at a given version */
const visibleQueryParameterOptions = (typeVersion: number) =>
	(optionsCollection.options as INodeProperties[]).filter(
		(option) =>
			option.name === 'queryReplacement' &&
			NodeHelpers.displayParameter({}, option, { typeVersion }, versionDescription, {
				operation: 'executeQuery',
			}),
	);

describe('PostgresV2, Query Parameters option', () => {
	it.each(versionDescription.version as number[])(
		'should show exactly one Query Parameters option at v%s',
		(typeVersion) => {
			expect(visibleQueryParameterOptions(typeVersion)).toHaveLength(1);
		},
	);

	it.each([
		{ typeVersion: 2.7, mentionsOneValue: false },
		{ typeVersion: 2.8, mentionsOneValue: true },
	])(
		'should tell that an expression gives one value only from v2.8 (v$typeVersion)',
		({ typeVersion, mentionsOneValue }) => {
			const [option] = visibleQueryParameterOptions(typeVersion);

			expect(option.hint?.includes('An expression always gives one value')).toBe(mentionsOneValue);
		},
	);
});

describe('PostgresV2, schema and table pickers', () => {
	const isShown = (name: string, operation: string) => {
		const picker = versionDescription.properties.find(
			(property) => property.name === name,
		) as INodeProperties;

		return NodeHelpers.displayParameter(
			{ resource: 'database', operation },
			picker,
			{ typeVersion: 2.8 },
			versionDescription,
		);
	};

	// Both pickers are required, and they attach to every operation by exclusion, so each new
	// operation has to opt out of the ones it does not take.
	it.each([
		['deleteTable', true, true],
		['executeQuery', false, false],
		['insert', true, true],
		['listSchemas', false, false],
		['listTables', true, false],
		['select', true, true],
		['update', true, true],
		['upsert', true, true],
	])('should show schema and table for %s as %s and %s', (operation, schema, table) => {
		expect(isShown('schema', operation)).toBe(schema);
		expect(isShown('table', operation)).toBe(table);
	});
});

describe('PostgresV2, annotations', () => {
	const table = { __rl: true, mode: 'list', value: 'users' };

	it.each([
		[{ operation: 'select' }, READ_ONLY_ANNOTATIONS],
		[{ operation: 'listSchemas' }, READ_ONLY_ANNOTATIONS],
		[{ operation: 'listTables' }, READ_ONLY_ANNOTATIONS],
		[{ operation: 'insert' }, { effect: 'write', destructive: false, idempotent: false }],
		[{ operation: 'upsert' }, { effect: 'write', destructive: true, idempotent: false }],
		[{ operation: 'executeQuery' }, { effect: 'write', destructive: true, idempotent: false }],
		[
			{ operation: 'deleteTable', table, deleteCommand: 'truncate' },
			{ effect: 'write', destructive: true, idempotent: true },
		],
		[
			{ operation: 'deleteTable', table, deleteCommand: 'drop' },
			{ effect: 'write', destructive: true, idempotent: true },
		],
		[
			{ operation: 'deleteTable', deleteCommand: 'truncate' },
			{ effect: 'write', destructive: true, idempotent: false },
		],
	])('should resolve %j', (parameters, expected) => {
		expect(resolveNodeAnnotations(versionDescription, { parameters, typeVersion: 2.8 })).toEqual(
			expected,
		);
	});
});
