import type { IDataObject, INodeProperties } from 'n8n-workflow';
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

/** Every property of this name that the editor shows for the operation */
const shownProperties = (name: string, operation: string, nodeValues: IDataObject = {}) =>
	versionDescription.properties.filter(
		(property) =>
			property.name === name &&
			NodeHelpers.displayParameter(
				{ resource: 'database', operation, ...nodeValues },
				property,
				{ typeVersion: 2.8 },
				versionDescription,
			),
	);

const ALL_OPERATIONS = [
	'deleteTable',
	'executeQuery',
	'insert',
	'listSchemas',
	'listTables',
	'select',
	'update',
	'upsert',
];

describe('PostgresV2, schema and table pickers', () => {
	const isShown = (name: string, operation: string) => shownProperties(name, operation).length > 0;

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

	// The Schema picker is declared twice, so that List Tables can describe it differently
	it.each(ALL_OPERATIONS)('should show at most one Schema picker for %s', (operation) => {
		expect(shownProperties('schema', operation).length).toBeLessThanOrEqual(1);
	});

	it('should say the schema holds the tables to list for listTables', () => {
		expect(shownProperties('schema', 'listTables')[0].description).toBe(
			'The schema that contains the tables you want to list',
		);
	});

	it.each(['deleteTable', 'insert', 'select', 'update', 'upsert'])(
		'should keep the single-table wording for %s',
		(operation) => {
			expect(shownProperties('schema', operation)[0].description).toBe(
				'The schema that contains the table you want to work on',
			);
		},
	);
});

describe('PostgresV2, Options collection', () => {
	// Query Batching, Connection Timeout and the rest live here, so every operation needs the collection
	it.each(ALL_OPERATIONS)('should show the Options collection for %s', (operation) => {
		expect(shownProperties('options', operation, { table: 'users' })).toHaveLength(1);
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

describe('PostgresV2, Start After', () => {
	const startAfter = versionDescription.properties.find(
		(property) => property.name === 'startAfter',
	) as INodeProperties;

	it.each([
		{ returnAll: false, typeVersion: 2.8, shown: true },
		{ returnAll: true, typeVersion: 2.8, shown: false },
		{ returnAll: false, typeVersion: 2.7, shown: true },
		{ returnAll: false, typeVersion: 2.6, shown: false },
		// n8n shows a field when a show value is an expression, so the version must be checked first
		{ returnAll: '={{ false }}', typeVersion: 2.7, shown: true },
		{ returnAll: '={{ false }}', typeVersion: 2.6, shown: false },
	])(
		'should show Start After: $shown when Return All is $returnAll at v$typeVersion',
		({ returnAll, typeVersion, shown }) => {
			const parameters = {
				resource: 'database',
				operation: 'select',
				table: { __rl: true, mode: 'list', value: 'orders' },
				returnAll,
			};

			expect(
				NodeHelpers.displayParameter(parameters, startAfter, { typeVersion }, versionDescription),
			).toBe(shown);
		},
	);
});
