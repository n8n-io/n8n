import type {
	INodeParameters,
	INodeProperties,
	INodeTypeDescription,
	NodeOperationAnnotations,
} from '../src/interfaces';
import { READ_ONLY_ANNOTATIONS as READ, resolveNodeAnnotations } from '../src/node-annotations';
const RESTRICTIVE: NodeOperationAnnotations = {
	effect: 'write',
	destructive: true,
	idempotent: false,
};

const describeNode = (
	properties: INodeProperties[],
	annotations?: INodeTypeDescription['annotations'],
): INodeTypeDescription => ({
	displayName: 'Test',
	name: 'test',
	group: [],
	version: 1,
	description: '',
	defaults: {},
	inputs: [],
	outputs: [],
	properties,
	annotations,
});

const resolve = (description: INodeTypeDescription, parameters: INodeParameters = {}) =>
	resolveNodeAnnotations(description, { parameters, typeVersion: 1 });

const resourceProperty: INodeProperties = {
	displayName: 'Resource',
	name: 'resource',
	type: 'options',
	default: 'record',
	options: [
		{ name: 'Record', value: 'record' },
		{ name: 'Table', value: 'table' },
	],
};

const recordOperations: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	default: 'get',
	displayOptions: { show: { resource: ['record'] } },
	options: [
		{ name: 'Get', value: 'get', annotations: READ },
		{
			name: 'Delete',
			value: 'delete',
			annotations: { effect: 'write', destructive: true, idempotent: false },
		},
		{ name: 'Run', value: 'run' },
	],
};

const listOption = { name: 'List', value: 'list', annotations: READ };

const tableOperations: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	default: 'drop',
	displayOptions: { show: { resource: ['table'] } },
	options: [
		listOption,
		{
			name: 'Drop',
			value: 'drop',
			annotations: { effect: 'write', destructive: true },
		},
	],
};

const modeProperty: INodeProperties = {
	displayName: 'Mode',
	name: 'mode',
	type: 'options',
	default: 'safe',
	displayOptions: { show: { operation: ['drop'] } },
	options: [
		{ name: 'Safe', value: 'safe', annotations: { idempotent: true } },
		{ name: 'Strict', value: 'strict', annotations: { idempotent: false } },
	],
};

const node = describeNode([resourceProperty, recordOperations, tableOperations, modeProperty]);

describe('resolveNodeAnnotations', () => {
	it('returns the restrictive default when nothing is annotated', () => {
		expect(resolve(describeNode([resourceProperty]))).toEqual(RESTRICTIVE);
	});

	it('applies node-level annotations', () => {
		expect(resolve(describeNode([], READ))).toEqual(READ);
	});

	it('applies the annotations of the selected option', () => {
		expect(resolve(node, { resource: 'record', operation: 'delete' })).toEqual(RESTRICTIVE);
		expect(resolve(node, { resource: 'record', operation: 'get' })).toEqual(READ);
	});

	it('uses the default of an omitted parameter', () => {
		expect(resolve(node)).toEqual(READ);
	});

	it('keeps the default for an option without annotations', () => {
		expect(resolve(node, { resource: 'record', operation: 'run' })).toEqual(RESTRICTIVE);
	});

	it('reads the operation property that is visible for the resource', () => {
		expect(resolve(node, { resource: 'table', operation: 'list' })).toEqual(READ);
	});

	it('combines annotations from several properties', () => {
		expect(resolve(node, { resource: 'table', operation: 'drop', mode: 'safe' })).toEqual({
			effect: 'write',
			destructive: true,
			idempotent: true,
		});
		expect(resolve(node, { resource: 'table', operation: 'drop', mode: 'strict' })).toEqual(
			RESTRICTIVE,
		);
	});

	it('ignores a hidden property', () => {
		expect(resolve(node, { resource: 'table', operation: 'list', mode: 'strict' })).toEqual(READ);
	});

	it('lets a restrictive value win over a permissive value', () => {
		const description = describeNode([resourceProperty, recordOperations], { idempotent: true });
		expect(resolve(description, { resource: 'record', operation: 'delete' })).toEqual(RESTRICTIVE);
	});

	it('uses the most restrictive option when the value is an expression', () => {
		const allRead = describeNode([
			{ ...tableOperations, displayOptions: undefined, options: [listOption] },
		]);
		expect(resolve(allRead, { operation: '={{ $json.operation }}' })).toEqual(READ);
		expect(resolve(node, { resource: 'record', operation: '={{ $json.operation }}' })).toEqual(
			RESTRICTIVE,
		);
	});

	it('uses the most restrictive option when visibility depends on an expression', () => {
		const recordNode = describeNode([resourceProperty, recordOperations]);
		expect(resolve(recordNode, { resource: 'record', operation: 'get' })).toEqual(READ);
		expect(resolve(recordNode, { resource: '={{ $json.resource }}', operation: 'get' })).toEqual(
			RESTRICTIVE,
		);
	});

	it('uses the restrictive default for a value that matches no option', () => {
		const allRead = describeNode([
			{ ...tableOperations, displayOptions: undefined, options: [listOption] },
		]);
		expect(resolve(allRead, { operation: 'removed' })).toEqual(RESTRICTIVE);
	});

	describe('multiOptions parameters', () => {
		const WRITE = { effect: 'write', destructive: false, idempotent: false } as const;
		const fieldsNode = describeNode([
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'multiOptions',
				default: [],
				options: [
					{ name: 'Read', value: 'read', annotations: READ },
					{ name: 'Write', value: 'write', annotations: WRITE },
				],
			},
		]);

		it('applies the annotations of every selected option', () => {
			expect(resolve(fieldsNode, { fields: ['read'] })).toEqual(READ);
			expect(resolve(fieldsNode, { fields: ['read', 'write'] })).toEqual(WRITE);
		});

		it('keeps the default when nothing is selected', () => {
			expect(resolve(fieldsNode, { fields: [] })).toEqual(RESTRICTIVE);
		});

		it('uses the most restrictive option when the value is an expression', () => {
			expect(resolve(fieldsNode, { fields: '={{ $json.fields }}' })).toEqual(WRITE);
		});
	});

	describe('nested parameters', () => {
		const NOTIFY = { effect: 'write', destructive: false, idempotent: false } as const;

		const sideEffect = (
			defaultValue = 'none',
			displayOptions?: INodeProperties['displayOptions'],
		): INodeProperties => ({
			displayName: 'Side Effect',
			name: 'sideEffect',
			type: 'options',
			default: defaultValue,
			displayOptions,
			options: [
				{ name: 'None', value: 'none' },
				{ name: 'Notify', value: 'notify', annotations: NOTIFY },
			],
		});

		const withCollection = (child: INodeProperties) =>
			describeNode([
				resourceProperty,
				recordOperations,
				{
					displayName: 'Additional Fields',
					name: 'additionalFields',
					type: 'collection',
					default: {},
					options: [child],
				},
			]);

		const withFixedCollection = (child: INodeProperties) =>
			describeNode([
				resourceProperty,
				recordOperations,
				{
					displayName: 'Rules',
					name: 'rules',
					type: 'fixedCollection',
					typeOptions: { multipleValues: true },
					default: {},
					options: [{ displayName: 'Rule', name: 'rule', values: [child] }],
				},
			]);

		it('applies the annotations of a selected option in a collection', () => {
			expect(
				resolve(withCollection(sideEffect()), { additionalFields: { sideEffect: 'notify' } }),
			).toEqual(NOTIFY);
		});

		it('uses the default of an unset collection child', () => {
			expect(resolve(withCollection(sideEffect()))).toEqual(READ);
			expect(resolve(withCollection(sideEffect('notify')))).toEqual(NOTIFY);
		});

		it('combines every entry of a fixedCollection', () => {
			expect(
				resolve(withFixedCollection(sideEffect()), {
					rules: { rule: [{ sideEffect: 'none' }, { sideEffect: 'notify' }] },
				}),
			).toEqual(NOTIFY);
		});

		it('ignores a fixedCollection without entries', () => {
			expect(resolve(withFixedCollection(sideEffect('notify')))).toEqual(READ);
		});

		it('checks the visibility of a child against the root parameters', () => {
			const child = sideEffect('none', { show: { '/operation': ['delete'] } });
			expect(
				resolve(withCollection(child), { additionalFields: { sideEffect: 'notify' } }),
			).toEqual(READ);
		});
	});
});
