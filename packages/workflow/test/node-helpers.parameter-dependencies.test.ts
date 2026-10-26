import type { INodeParameters, INodeProperties } from '../src/interfaces';
import { getNodeParameters } from '../src/node-helpers';

// Regression test for CAT-3999 / NODE-5693 (GH #35788, #35783):
// A `displayOptions` key that names no parameter at its own level used to make
// getNodeParameters throw "Could not resolve parameter dependencies. Max
// iterations reached!", aborting workflow load/activation/publish and leaving a
// blank canvas. Such a dependency can never be satisfied at that level, so the
// resolver now treats it as external and lets `displayParameter` decide
// visibility instead.

/** A `fixedCollection` whose child gates on `dep`, mirroring the Baserow filters shape. */
const withChildDependency = (dep: string): INodeProperties[] => [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		default: 'getAll',
		options: [{ name: 'Get Many', value: 'getAll' }],
	},
	{
		displayName: 'Additional Options',
		name: 'additionalOptions',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		options: [
			{
				displayName: 'Filters',
				name: 'filters',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true },
				default: {},
				options: [
					{
						name: 'fields',
						displayName: 'Field',
						values: [
							{
								displayName: 'Field Name or ID',
								name: 'field',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Filter',
								name: 'operator',
								type: 'options',
								default: 'equal',
								options: [
									{ name: 'Is', value: 'equal' },
									{ name: 'Is Date', value: 'date_is' },
								],
							},
							{
								displayName: 'Timezone',
								name: 'timezone',
								type: 'string',
								default: 'UTC',
								displayOptions: { show: { [dep]: ['date_is'] } },
							},
						],
					},
				],
			},
		],
	},
];

const populated: INodeParameters = {
	operation: 'getAll',
	additionalOptions: {
		filters: { fields: [{ field: '9882393', operator: 'date_is' }] },
	},
};

const resolve = (props: INodeProperties[], values: INodeParameters) =>
	getNodeParameters(props, values, true, false, null, null);

describe('getNodeParameters dependency resolution', () => {
	// Each of these names nothing at the `timezone` parameter's own level, so it
	// is unsatisfiable there: `timezone` is hidden rather than throwing.
	test.each([
		['a relative-path reference', '../operator'],
		['a dot-notation reference', 'filters.fields.operator'],
		['a name only present at an enclosing level', 'operation'],
		['a name that exists nowhere', 'nonExistentParameter'],
	])('hides the parameter instead of throwing for %s', (_label, dep) => {
		expect(resolve(withChildDependency(dep), populated)).toEqual(populated);
	});

	test('resolves a sibling reference and applies the default when displayed', () => {
		expect(resolve(withChildDependency('operator'), populated)).toEqual({
			operation: 'getAll',
			additionalOptions: {
				filters: { fields: [{ field: '9882393', operator: 'date_is', timezone: 'UTC' }] },
			},
		});
	});

	test('hides a sibling-gated parameter when the sibling does not match', () => {
		const values: INodeParameters = {
			operation: 'getAll',
			additionalOptions: { filters: { fields: [{ field: '9882393', operator: 'equal' }] } },
		};

		expect(resolve(withChildDependency('operator'), values)).toEqual(values);
	});

	test('resolves a root-level reference from inside a fixedCollection', () => {
		expect(resolve(withChildDependency('/operation'), populated)).toEqual(populated);
	});

	test('leaves an empty fixedCollection untouched', () => {
		expect(resolve(withChildDependency('../operator'), { additionalOptions: {} })).toEqual({
			operation: 'getAll',
			additionalOptions: {},
		});
	});

	test('still resolves parameters that depend on each other in a cycle', () => {
		// Mutually dependent siblings are tolerated rather than reported as
		// unresolvable; this guards that behaviour against resolver changes.
		const cyclic: INodeProperties[] = [
			{
				displayName: 'X',
				name: 'x',
				type: 'string',
				default: '',
				displayOptions: { show: { y: ['1'] } },
			},
			{
				displayName: 'Y',
				name: 'y',
				type: 'string',
				default: '',
				displayOptions: { show: { x: ['1'] } },
			},
		];

		expect(resolve(cyclic, { x: '1', y: '1' })).toEqual({ x: '1', y: '1' });
	});
});
