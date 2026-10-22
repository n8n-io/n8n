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
		expect(resolve(node, { resource: 'table', operation: 'list', mode: 'safe' })).toEqual(READ);
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
		expect(resolve(node, { resource: '={{ $json.resource }}', operation: 'get' })).toEqual(
			RESTRICTIVE,
		);
	});
});
