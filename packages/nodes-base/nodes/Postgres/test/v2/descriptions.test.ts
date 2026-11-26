import type { INodeParameters, INodeProperties } from 'n8n-workflow';
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

const isLegacyQuotedParameterOptionVisible = (typeVersion: number) => {
	const option = (optionsCollection.options as INodeProperties[]).find(
		({ name }) => name === 'treatQueryParametersInSingleQuotesAsText',
	);
	if (!option) return false;

	return NodeHelpers.displayParameter(
		{ queryReplacement: 'value' },
		option,
		{ typeVersion },
		versionDescription,
	);
};

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
		{ typeVersion: 2.9, mentionsOneValue: true },
	])(
		'should tell that an expression gives one value only from v2.8 (v$typeVersion)',
		({ typeVersion, mentionsOneValue }) => {
			const [option] = visibleQueryParameterOptions(typeVersion);

			expect(option.hint?.includes('An expression always gives one value')).toBe(mentionsOneValue);
		},
	);

	it('should hide the legacy quoted parameter option from v2.9', () => {
		expect(isLegacyQuotedParameterOptionVisible(2.8)).toBe(true);
		expect(isLegacyQuotedParameterOptionVisible(2.9)).toBe(false);
	});
});

describe('PostgresV2, annotations', () => {
	const table = { __rl: true, mode: 'list', value: 'users' };

	it.each([
		[{ operation: 'select' }, READ_ONLY_ANNOTATIONS],
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

describe('PostgresV2, Load Rows With COPY option', () => {
	const visibleOptions = (operation: string, options: INodeParameters) =>
		(optionsCollection.options as INodeProperties[])
			.filter((option) =>
				NodeHelpers.displayParameter(options, option, { typeVersion: 2.8 }, versionDescription, {
					operation,
					options,
				}),
			)
			.map((option) => option.name);

	const optionsHiddenByCopy = ['queryBatching', 'outputColumns', 'skipOnConflict'];

	it('should show only for Insert', () => {
		expect(visibleOptions('insert', {})).toContain('useCopy');
		['select', 'update', 'upsert', 'executeQuery', 'deleteTable'].forEach((operation) => {
			expect(visibleOptions(operation, {})).not.toContain('useCopy');
		});
	});

	it.each([{}, { useCopy: false }])(
		'should keep the other Insert options when it is off (%o)',
		(options) => {
			expect(visibleOptions('insert', options)).toEqual(
				expect.arrayContaining(optionsHiddenByCopy),
			);
		},
	);

	it('should hide Query Batching, Output Columns and Skip on Conflict when it is on', () => {
		const visible = visibleOptions('insert', { useCopy: true });

		expect(visible).toContain('useCopy');
		optionsHiddenByCopy.forEach((name) => expect(visible).not.toContain(name));
	});
});
