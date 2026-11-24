import has from 'lodash/has';

import type {
	INode,
	INodeParameters,
	INodeProperties,
	INodeTypeDescription,
} from '../src/interfaces';
import { carryOverNodeParameters } from '../src/node-helpers';
import {
	desc,
	httpRequestV1,
	httpRequestV3,
	kafkaV1,
	kafkaV2,
	switchV1,
	switchV3,
	ifV1,
	ifV2,
} from './fixtures/node-version-descriptions';

const node = (typeVersion: number, parameters: INodeParameters): INode => ({
	id: '1',
	name: 'Node',
	type: 'test',
	typeVersion,
	position: [0, 0],
	parameters,
});

/** Runs the helper and checks that `parameters` holds no value that `setAside` lists. */
const carry = (...args: Parameters<typeof carryOverNodeParameters>) => {
	const result = carryOverNodeParameters(...args);
	for (const { path } of result.setAside) {
		expect(has(result.parameters, path)).toBe(false);
	}
	return result;
};

const names = (result: ReturnType<typeof carryOverNodeParameters>) =>
	result.setAside.map(({ name }) => name);

const operation = (resource: string, values: string[]): INodeProperties => ({
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	displayOptions: { show: { resource: [resource] } },
	options: values.map((value) => ({ name: value, value })),
	default: values[0],
});

describe('carryOverNodeParameters', () => {
	describe('HTTP Request 1 to 3', () => {
		it('should set aside renamed, removed and moved values and keep the others', () => {
			const result = carry(
				node(1, {
					requestMethod: 'POST',
					authentication: 'basicAuth',
					url: 'https://example.com',
					options: { batchSize: 10, timeout: 5000 },
				}),
				httpRequestV1,
				httpRequestV3,
				3,
			);

			expect(result).toEqual({
				parameters: { url: 'https://example.com', options: { timeout: 5000 } },
				setAside: [
					{
						name: 'requestMethod',
						path: ['requestMethod'],
						displayName: 'Request Method',
						value: 'POST',
					},
					{
						name: 'authentication',
						path: ['authentication'],
						displayName: 'Authentication',
						value: 'basicAuth',
					},
					{
						name: 'options.batchSize',
						path: ['options', 'batchSize'],
						displayName: 'Batch Size',
						value: 10,
					},
				],
				changedDefaults: [],
				issues: null,
			});
		});

		it('should report a required parameter that is empty', () => {
			const result = carry(node(1, { requestMethod: 'POST' }), httpRequestV1, httpRequestV3, 3);

			expect(result.issues).toEqual({ parameters: { url: ['Parameter "URL" is required.'] } });
		});
	});

	describe('Kafka 1 to 2', () => {
		it('should set aside a boolean on a parameter that is now an options list', () => {
			const result = carry(
				node(1, { topic: 'orders', options: { compression: true, acks: true } }),
				kafkaV1,
				kafkaV2,
				2,
			);

			expect(result).toEqual({
				parameters: { topic: 'orders', options: { acks: true } },
				setAside: [
					{
						name: 'options.compression',
						path: ['options', 'compression'],
						displayName: 'Compression',
						value: true,
					},
				],
				changedDefaults: [],
				issues: null,
			});
		});
	});

	describe('Switch 1 to 3', () => {
		it('should set aside the rules mode values when mode is at its default', () => {
			const rules = [{ operation: 'contains', value2: 'x', output: 1 }];
			const result = carry(
				node(1, {
					dataType: 'string',
					value1: '={{ $json.a }}',
					rules: { rules },
					fallbackOutput: 3,
				}),
				switchV1,
				switchV3,
				3,
			);

			expect(result).toEqual({
				parameters: {},
				setAside: [
					{ name: 'dataType', path: ['dataType'], displayName: 'Data Type', value: 'string' },
					{ name: 'value1', path: ['value1'], displayName: 'Value 1', value: '={{ $json.a }}' },
					{ name: 'rules.rules', path: ['rules', 'rules'], displayName: 'Strings', value: rules },
					{
						name: 'fallbackOutput',
						path: ['fallbackOutput'],
						displayName: 'Fallback Output',
						value: 3,
					},
				],
				changedDefaults: [],
				issues: null,
			});
		});

		it('should keep the expression mode values', () => {
			const result = carry(node(1, { mode: 'expression', output: 2 }), switchV1, switchV3, 3.2);

			expect(result).toEqual({
				parameters: { mode: 'expression', output: 2 },
				setAside: [],
				changedDefaults: [],
				issues: null,
			});
		});

		it('should list the changed default of an untouched parameter', () => {
			const result = carry(node(1, { mode: 'expression' }), switchV1, switchV3, 3.2);

			expect(result).toEqual({
				parameters: { mode: 'expression' },
				setAside: [],
				changedDefaults: [
					{ name: 'output', displayName: 'Output Index', oldDefault: 0, newDefault: '={{}}' },
				],
				issues: null,
			});
		});
	});

	describe('same-name option that the target does not offer', () => {
		const resource = (values: string[]): INodeProperties => ({
			displayName: 'Resource',
			name: 'resource',
			type: 'options',
			options: values.map((value) => ({ name: value, value })),
			default: 'folder',
		});
		const current = desc(1, [
			resource(['file', 'folder']),
			operation('file', ['upload', 'delete']),
			operation('folder', ['create', 'delete']),
		]);
		const target = desc(2, [
			resource(['folder', 'drive']),
			operation('folder', ['create', 'delete']),
			operation('drive', ['list']),
		]);

		it('should check the operation against the definition for the default resource', () => {
			const result = carry(node(1, { resource: 'file', operation: 'upload' }), current, target, 2);

			expect(result).toEqual({
				parameters: {},
				setAside: [
					{ name: 'resource', path: ['resource'], displayName: 'Resource', value: 'file' },
					{ name: 'operation', path: ['operation'], displayName: 'Operation', value: 'upload' },
				],
				changedDefaults: [],
				issues: null,
			});
		});

		it('should set aside an operation that was chosen for a removed resource', () => {
			const result = carry(node(1, { resource: 'file', operation: 'delete' }), current, target, 2);

			expect(result).toEqual({
				parameters: {},
				setAside: [
					{ name: 'resource', path: ['resource'], displayName: 'Resource', value: 'file' },
					{ name: 'operation', path: ['operation'], displayName: 'Operation', value: 'delete' },
				],
				changedDefaults: [],
				issues: null,
			});
		});
	});

	describe('If 1 to 2', () => {
		it('should set aside the conditions as one value', () => {
			const conditions = { string: [{ value1: '={{ $json.a }}', value2: 'x' }] };
			const result = carry(node(1, { conditions, combineOperation: 'any' }), ifV1, ifV2, 2.2);

			expect(result).toEqual({
				parameters: {},
				setAside: [
					{
						name: 'conditions',
						path: ['conditions'],
						displayName: 'Conditions',
						value: conditions,
					},
					{
						name: 'combineOperation',
						path: ['combineOperation'],
						displayName: 'Combine',
						value: 'any',
					},
				],
				changedDefaults: [],
				issues: null,
			});
		});
	});

	describe('structured types, same type in the two versions', () => {
		const type = desc(1, [
			{ displayName: 'Filter', name: 'filter', type: 'filter', default: {} },
			{
				displayName: 'Assignments',
				name: 'assignments',
				type: 'assignmentCollection',
				default: {},
			},
			{
				displayName: 'Columns',
				name: 'columns',
				type: 'resourceMapper',
				default: { mappingMode: 'defineBelow', value: null },
			},
		]);

		it('should keep a filter value that has no combinator', () => {
			const filter = { conditions: [] };
			const result = carry(node(1, { filter }), type, type, 1);

			expect(result.setAside).toEqual([]);
			expect(result.parameters.filter).toMatchObject(filter);
		});

		it('should keep an expression on a filter parameter', () => {
			const result = carry(node(1, { filter: '={{ $json.filter }}' }), type, type, 1);

			expect(result.setAside).toEqual([]);
			expect(result.parameters).toEqual({ filter: '={{ $json.filter }}' });
		});

		it('should keep an assignment that has no id', () => {
			const assignments = { assignments: [{ name: 'a', value: 1, type: 'number' }] };
			const result = carry(node(1, { assignments }), type, type, 1);

			expect(result.setAside).toEqual([]);
			expect(result.parameters).toEqual({ assignments });
		});

		it('should set aside an assignmentCollection value with an entry that is not a record', () => {
			const assignments = { assignments: [null] };
			const result = carry(node(1, { assignments }), type, type, 1);

			expect(names(result)).toEqual(['assignments']);
		});

		it('should set aside a string on a resourceMapper parameter', () => {
			const result = carry(node(1, { columns: 'id' }), type, type, 1);

			expect(result.setAside).toEqual([
				{ name: 'columns', path: ['columns'], displayName: 'Columns', value: 'id' },
			]);
		});

		it('should set aside a record without assignments on an assignmentCollection parameter', () => {
			const result = carry(node(1, { assignments: { values: [] } }), type, type, 1);

			expect(result.setAside).toEqual([
				{
					name: 'assignments',
					path: ['assignments'],
					displayName: 'Assignments',
					value: { values: [] },
				},
			]);
		});
	});

	describe('expression on a target noDataExpression parameter', () => {
		const properties = (noDataExpression: boolean): INodeProperties[] => [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression,
				options: [
					{ name: 'File', value: 'file' },
					{ name: 'Folder', value: 'folder' },
				],
				default: 'file',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: { show: { resource: ['file'] } },
				options: [
					{ name: 'Upload', value: 'upload' },
					{ name: 'Delete', value: 'delete' },
				],
				default: 'upload',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: { show: { resource: ['folder'] } },
				options: [{ name: 'Create', value: 'create' }],
				default: 'create',
			},
			{ displayName: 'Name', name: 'name', type: 'string', noDataExpression, default: '' },
			{
				displayName: 'Options',
				name: 'opts',
				type: 'collection',
				default: {},
				options: [
					{ displayName: 'Inner', name: 'inner', type: 'string', noDataExpression, default: '' },
				],
			},
		];
		const strict = desc(1, properties(true));
		const loose = desc(1, properties(false));

		it('should set aside an expression on an options parameter', () => {
			const result = carry(node(1, { resource: '={{ $json.r }}' }), loose, strict, 1);

			expect(result.setAside).toEqual([
				{ name: 'resource', path: ['resource'], displayName: 'Resource', value: '={{ $json.r }}' },
			]);
			expect(result.parameters).toEqual({});
		});

		it('should set aside an expression on a string parameter one time', () => {
			const result = carry(node(1, { name: '={{ $json.n }}' }), loose, strict, 1);

			expect(result.setAside).toEqual([
				{ name: 'name', path: ['name'], displayName: 'Name', value: '={{ $json.n }}' },
			]);
			expect(result.parameters).toEqual({});
		});

		it('should set aside an expression on a collection child', () => {
			const result = carry(node(1, { opts: { inner: '={{ 1 }}' } }), loose, strict, 1);

			expect(result.setAside).toEqual([
				{ name: 'opts.inner', path: ['opts', 'inner'], displayName: 'Inner', value: '={{ 1 }}' },
			]);
		});

		it('should keep a lone $fromAI placeholder', () => {
			const result = carry(node(1, { name: "={{ $fromAI('x') }}" }), loose, strict, 1);

			expect(result.setAside).toEqual([]);
			expect(result.parameters).toEqual({ name: "={{ $fromAI('x') }}" });
		});

		it('should set aside a list with an expression entry', () => {
			const tags = (noDataExpression: boolean) =>
				desc(1, [
					{
						displayName: 'Tags',
						name: 'tags',
						type: 'string',
						typeOptions: { multipleValues: true },
						noDataExpression,
						default: [],
					},
				]);
			const value = ['literal', '={{ $json.value }}'];

			expect(names(carry(node(1, { tags: value }), tags(false), tags(true), 1))).toEqual(['tags']);
			const kept = carry(node(1, { tags: value }), tags(true), tags(false), 1);
			expect(kept.setAside).toEqual([]);
			expect(kept.parameters).toEqual({ tags: value });
		});

		it('should set aside a dependent value with the expression', () => {
			const result = carry(
				node(1, { resource: '={{ $json.r }}', operation: 'delete' }),
				strict,
				strict,
				1,
			);

			expect(names(result)).toEqual(['resource', 'operation']);
			expect(result.parameters).toEqual({});
		});

		it('should keep all values when the target has no noDataExpression', () => {
			const parameters = {
				resource: '={{ $json.r }}',
				operation: 'delete',
				name: '={{ $json.n }}',
				opts: { inner: '={{ 1 }}' },
			};
			const result = carry(node(1, parameters), strict, loose, 1);

			expect(result.setAside).toEqual([]);
			expect(result.parameters).toEqual(parameters);
		});
	});

	describe('small cases', () => {
		// A regression shows as a test that does not end.
		it('should end when an options parameter has an empty default', () => {
			const type = desc(1, [
				{
					displayName: 'Operation',
					name: 'operation',
					type: 'options',
					options: [{ name: 'Get', value: 'get' }],
					default: '',
				},
			]);

			expect(carry(node(1, {}), type, type, 1)).toEqual({
				parameters: {},
				setAside: [],
				changedDefaults: [],
				issues: null,
			});
		});

		it('should keep an expression on an options parameter', () => {
			const type = desc(1, [
				{
					displayName: 'Operation',
					name: 'operation',
					type: 'options',
					options: [{ name: 'Get', value: 'get' }],
					default: 'get',
				},
			]);
			const result = carry(node(1, { operation: '={{ $json.op }}' }), type, type, 1);

			expect(result.setAside).toEqual([]);
			expect(result.parameters).toEqual({ operation: '={{ $json.op }}' });
		});

		it('should keep the value of a loadOptionsMethod parameter', () => {
			const type = desc(1, [
				{
					displayName: 'Channel',
					name: 'channel',
					type: 'options',
					typeOptions: { loadOptionsMethod: 'getChannels' },
					default: '',
				},
			]);
			const result = carry(node(1, { channel: 'C123' }), type, type, 1);

			expect(result.setAside).toEqual([]);
			expect(result.parameters).toEqual({ channel: 'C123' });
		});

		it('should set aside a multiOptions value when one entry is not offered', () => {
			const events = (values: string[]): INodeProperties => ({
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				options: values.map((value) => ({ name: value, value })),
				default: [],
			});
			const result = carry(
				node(1, { events: ['created', 'archived'] }),
				desc(1, [events(['created', 'archived'])]),
				desc(2, [events(['created'])]),
				2,
			);

			expect(result.setAside).toEqual([
				{ name: 'events', path: ['events'], displayName: 'Events', value: ['created', 'archived'] },
			]);
			expect(result.parameters).toEqual({});
		});

		it('should set aside one field of a fixedCollection item and keep the others', () => {
			const fc = (kinds: string[]): INodeProperties => ({
				displayName: 'Fields',
				name: 'fc',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true },
				default: {},
				options: [
					{
						name: 'values',
						displayName: 'Values',
						values: [
							{ displayName: 'Label', name: 'label', type: 'string', default: '' },
							{
								displayName: 'Kind',
								name: 'kind',
								type: 'options',
								options: kinds.map((value) => ({ name: value, value })),
								default: 'text',
							},
						],
					},
				],
			});
			const result = carry(
				node(1, { fc: { values: [{ label: 'a', kind: 'legacy' }] } }),
				desc(1, [fc(['text', 'legacy'])]),
				desc(2, [fc(['text'])]),
				2,
			);

			expect(result.setAside).toEqual([
				{
					name: 'fc.values[0].kind',
					path: ['fc', 'values', 0, 'kind'],
					displayName: 'Kind',
					value: 'legacy',
				},
			]);
			expect(result.parameters).toEqual({ fc: { values: [{ label: 'a' }] } });
		});

		it('should return the issues of a disabled node', () => {
			const result = carry({ ...node(1, {}), disabled: true }, httpRequestV1, httpRequestV3, 3);

			expect(result.issues).toEqual({ parameters: { url: ['Parameter "URL" is required.'] } });
		});

		it('should not change the node or share values with it', () => {
			const input = node(1, { conditions: { string: [{ value1: 'a', value2: 'x' }] } });
			const snapshot = structuredClone(input);

			const result = carry(input, ifV1, ifV2, 2.2);

			expect(input).toEqual(snapshot);
			expect(names(result)).toEqual(['conditions']);
			const setAsideConditions = result.setAside[0].value as INodeParameters;
			setAsideConditions.string = [];
			expect(input).toEqual(snapshot);
		});
	});

	describe('single-value fixedCollection with an empty value', () => {
		it('should remove unknown and hidden siblings from the parameters', () => {
			const target = desc(2, [
				{ displayName: 'URL', name: 'url', type: 'string', default: '' },
				{
					displayName: 'Send Body',
					name: 'sendBody',
					type: 'boolean',
					default: false,
				},
				{
					displayName: 'Body',
					name: 'body',
					type: 'string',
					displayOptions: { show: { sendBody: [true] } },
					default: '',
				},
				{
					displayName: 'Batching',
					name: 'fc',
					type: 'fixedCollection',
					typeOptions: { multipleValues: false },
					default: { batch: {} },
					options: [
						{
							displayName: 'Batching',
							name: 'batch',
							values: [
								{ displayName: 'Batch Size', name: 'batchSize', type: 'number', default: 50 },
							],
						},
					],
				},
			]);
			const result = carry(
				node(1, { url: 'https://example.com', requestMethod: 'POST', body: 'hidden', fc: {} }),
				httpRequestV1,
				target,
				2,
			);

			expect(names(result)).toEqual(['requestMethod', 'body']);
			expect(result.parameters).toEqual({ url: 'https://example.com', fc: {} });
		});
	});

	describe('more than one displayed definition', () => {
		const type = desc(1, [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{ name: 'File', value: 'file' },
					{ name: 'Folder', value: 'folder' },
				],
				default: 'file',
			},
			operation('file', ['upload']),
			operation('folder', ['create', 'delete']),
		]);

		it('should keep a value that one of the definitions offers', () => {
			const parameters = { resource: '={{ $json.r }}', operation: 'delete' };
			const result = carry(node(1, parameters), type, type, 1);

			expect(result.setAside).toEqual([]);
			expect(result.parameters).toEqual(parameters);
		});

		it('should set aside a value that no definition offers', () => {
			const result = carry(
				node(1, { resource: '={{ $json.r }}', operation: 'gone' }),
				type,
				type,
				1,
			);

			expect(result.setAside).toEqual([
				{ name: 'operation', path: ['operation'], displayName: 'Operation', value: 'gone' },
			]);
			expect(result.parameters).toEqual({ resource: '={{ $json.r }}' });
		});
	});

	describe('saved key that contains a dot', () => {
		it('should not mix up the key with a nested path', () => {
			const type = desc(1, [
				{
					displayName: 'Options',
					name: 'options',
					type: 'collection',
					default: {},
					options: [
						{ displayName: 'Verify TLS', name: 'verifyTls', type: 'boolean', default: false },
						{ displayName: 'Timeout', name: 'timeout', type: 'number', default: 10 },
					],
				},
				{
					displayName: 'Fields',
					name: 'fc',
					type: 'fixedCollection',
					typeOptions: { multipleValues: true },
					default: {},
					options: [
						{
							name: 'group',
							displayName: 'Group',
							values: [{ displayName: 'A', name: 'a', type: 'number', default: 0 }],
						},
					],
				},
			]);

			// No shared `has` check: a dotted `name` is also a valid nested path.
			const result = carryOverNodeParameters(
				node(1, {
					'options.verifyTls': 'junk',
					options: { verifyTls: true, timeout: 5 },
					'fc.group[0].a': 'junk',
					fc: { group: [{ a: 7 }] },
				}),
				type,
				type,
				1,
			);

			expect(result.parameters).toEqual({
				options: { verifyTls: true, timeout: 5 },
				fc: { group: [{ a: 7 }] },
			});
			expect(result.setAside).toEqual([
				{
					name: 'options.verifyTls',
					path: ['options.verifyTls'],
					displayName: 'options.verifyTls',
					value: 'junk',
				},
				{
					name: 'fc.group[0].a',
					path: ['fc.group[0].a'],
					displayName: 'fc.group[0].a',
					value: 'junk',
				},
			]);
		});
	});

	describe('fixedCollection group with the wrong shape', () => {
		const fc = (multipleValues: boolean): INodeProperties => ({
			displayName: 'Fields',
			name: 'fc',
			type: 'fixedCollection',
			typeOptions: { multipleValues },
			default: {},
			options: [
				{
					name: 'group',
					displayName: 'Group',
					values: [{ displayName: 'A', name: 'a', type: 'number', default: 0 }],
				},
			],
		});
		const multiple = desc(1, [fc(true)]);
		const single = desc(1, [fc(false)]);
		const nested = desc(1, [
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				default: {},
				options: [fc(true)],
			},
		]);

		it('should set aside a record on a group that takes multiple values', () => {
			const result = carry(node(1, { fc: { group: { a: 1 } } }), multiple, multiple, 1);

			expect(result.setAside).toEqual([
				{ name: 'fc.group', path: ['fc', 'group'], displayName: 'Group', value: { a: 1 } },
			]);
			expect(result.parameters).toEqual({});
		});

		it('should set aside an array on a group that takes one value', () => {
			const result = carry(node(1, { fc: { group: [{ a: 1 }] } }), multiple, single, 1);

			expect(result.setAside).toEqual([
				{ name: 'fc.group', path: ['fc', 'group'], displayName: 'Group', value: [{ a: 1 }] },
			]);
			expect(result.parameters).toEqual({ fc: {} });
		});

		it.each([null, 'abc', 5])('should set aside the group value %j', (group) => {
			const result = carry(node(1, { fc: { group } }), multiple, multiple, 1);

			expect(result.setAside).toEqual([
				{ name: 'fc.group', path: ['fc', 'group'], displayName: 'Group', value: group },
			]);
			expect(result.parameters).toEqual({});
		});

		it('should set aside a wrong group value in a nested fixedCollection', () => {
			const result = carry(node(1, { options: { fc: { group: null } } }), nested, nested, 1);

			// `getNodeParameters` drops the empty fixedCollection, so the diff stops one level up.
			expect(result.setAside).toEqual([
				{
					name: 'options.fc',
					path: ['options', 'fc'],
					displayName: 'Fields',
					value: { group: null },
				},
			]);
			expect(result.parameters).toEqual({ options: {} });
		});

		it('should set aside a string on a collection and a number on a fixedCollection', () => {
			const type = desc(1, [...nested.properties, fc(true)]);
			const result = carry(node(1, { options: 'abc', fc: 5 }), type, type, 1);

			expect(result.setAside).toEqual([
				{ name: 'options', path: ['options'], displayName: 'Options', value: 'abc' },
				{ name: 'fc', path: ['fc'], displayName: 'Fields', value: 5 },
			]);
			expect(result.parameters).toEqual({});
		});
	});

	describe('target version', () => {
		const current = desc(1, [
			{ displayName: 'Legacy', name: 'legacy', type: 'string', default: '' },
		]);
		const target = desc(
			[2, 2.1],
			[
				{
					displayName: 'Legacy',
					name: 'legacy',
					type: 'string',
					displayOptions: { show: { '@version': [{ _cnd: { lt: 2.1 } }] } },
					default: '',
				},
			],
		);

		it('should keep a value that the target version displays', () => {
			expect(carry(node(1, { legacy: 'x' }), current, target, 2)).toEqual({
				parameters: { legacy: 'x' },
				setAside: [],
				changedDefaults: [],
				issues: null,
			});
		});

		it('should set aside a value that the target version hides', () => {
			expect(carry(node(1, { legacy: 'x' }), current, target, 2.1)).toEqual({
				parameters: {},
				setAside: [{ name: 'legacy', path: ['legacy'], displayName: 'Legacy', value: 'x' }],
				changedDefaults: [],
				issues: null,
			});
		});
	});

	describe('structured value with a wrong inner shape', () => {
		const type = desc(1, [
			{ displayName: 'Filter', name: 'f', type: 'filter', default: {} },
			{
				displayName: 'Columns',
				name: 'r',
				type: 'resourceMapper',
				default: { mappingMode: 'defineBelow', value: null },
			},
		]);

		it('should set aside a filter value whose conditions are not an array', () => {
			const f = { conditions: 'x', combinator: 'and' };
			const result = carry(node(1, { f }), type, type, 1);

			expect(result.setAside).toEqual([
				{ name: 'f', path: ['f'], displayName: 'Filter', value: f },
			]);
			expect(result.parameters).toEqual({});
		});

		it.each([[5], [[null]]])(
			'should set aside a resourceMapper value with the schema %j',
			(schema) => {
				const r = { mappingMode: 'defineBelow', value: { a: 1 }, schema, matchingColumns: [] };
				const result = carry(node(1, { r } as unknown as INodeParameters), type, type, 1);

				expect(result.setAside).toEqual([
					{ name: 'r', path: ['r'], displayName: 'Columns', value: r },
				]);
				expect(result.parameters).toEqual({});
			},
		);
	});

	describe('collection with multiple values', () => {
		const type = desc(1, [
			{
				displayName: 'Items',
				name: 'items',
				type: 'collection',
				typeOptions: { multipleValues: true },
				default: {},
				options: [{ displayName: 'A', name: 'a', type: 'string', default: '' }],
			},
		]);

		it('should set aside a record', () => {
			const result = carry(node(1, { items: { a: 'x' } }), type, type, 1);

			expect(result.setAside).toEqual([
				{ name: 'items', path: ['items'], displayName: 'Items', value: { a: 'x' } },
			]);
			expect(result.parameters).toEqual({});
		});

		it('should keep an array', () => {
			const result = carry(node(1, { items: [{ a: 'x' }] }), type, type, 1);

			expect(result.setAside).toEqual([]);
			expect(result.parameters).toEqual({ items: [{ a: 'x' }] });
		});
	});

	describe('changed default', () => {
		const b = (value: boolean): INodeTypeDescription =>
			desc(1, [{ displayName: 'B', name: 'b', type: 'boolean', default: value }]);

		it('should keep a saved value that equals the old default', () => {
			const result = carry(node(1, { b: false }), b(false), b(true), 1);

			expect(result.parameters).toEqual({ b: false });
			expect(result.changedDefaults).toEqual([]);
		});

		it('should list the changed default of an untouched parameter', () => {
			const result = carry(node(1, {}), b(false), b(true), 1);

			expect(result.changedDefaults).toEqual([
				{ name: 'b', displayName: 'B', oldDefault: false, newDefault: true },
			]);
		});
	});

	describe('type change to boolean or number', () => {
		it('should set aside a value of the wrong type', () => {
			const current = desc(1, [
				{
					displayName: 'Flag',
					name: 'flag',
					type: 'options',
					options: [
						{ name: 'On', value: 'on' },
						{ name: 'Off', value: 'off' },
					],
					default: 'off',
				},
				{ displayName: 'N', name: 'n', type: 'string', default: '' },
			]);
			const target = desc(2, [
				{ displayName: 'Flag', name: 'flag', type: 'boolean', default: false },
				{ displayName: 'N', name: 'n', type: 'number', default: 0 },
			]);
			const result = carry(node(1, { flag: 'on', n: '5' }), current, target, 2);

			expect(result.setAside).toEqual([
				{ name: 'flag', path: ['flag'], displayName: 'Flag', value: 'on' },
				{ name: 'n', path: ['n'], displayName: 'N', value: '5' },
			]);
			expect(result.parameters).toEqual({});
		});
	});

	describe('saved key with the name of an inherited property', () => {
		it('should set aside the key as one entry', () => {
			const description = desc(1, [{ displayName: 'S', name: 's', type: 'string', default: '' }]);
			const parameters: INodeParameters = JSON.parse('{"s":"x","__proto__":{}}');
			const result = carry(node(1, parameters), description, description, 1);

			expect(result.parameters).toEqual({ s: 'x' });
			expect(result.setAside).toEqual([
				{ name: '__proto__', path: ['__proto__'], displayName: '__proto__', value: {} },
			]);
		});
	});

	describe('value with the wrong shape for the target type', () => {
		const locator: INodeProperties = {
			displayName: 'Channel',
			name: 'channel',
			type: 'resourceLocator',
			default: { mode: 'list', value: '' },
			modes: [
				{ displayName: 'From List', name: 'list', type: 'list' },
				{ displayName: 'ID', name: 'id', type: 'string' },
			],
		};
		const text: INodeProperties = {
			displayName: 'Channel',
			name: 'channel',
			type: 'string',
			default: '',
		};

		it('should set aside a string on a resourceLocator parameter', () => {
			const result = carry(node(1, { channel: 'C1' }), desc(1, [text]), desc(2, [locator]), 2);

			expect(names(result)).toEqual(['channel']);
			expect(result.parameters).toEqual({});
		});

		it('should set aside a resourceLocator value with a mode that the target does not have', () => {
			const type = desc(1, [locator]);
			const value = { __rl: true, mode: 'url', value: 'https://example.com' };
			const result = carry(node(1, { channel: value }), type, type, 1);

			expect(names(result)).toEqual(['channel']);
		});

		it('should keep a resourceLocator value with a mode that the target has', () => {
			const type = desc(1, [locator]);
			const value = { __rl: true, mode: 'id', value: 'C1' };
			const result = carry(node(1, { channel: value }), type, type, 1);

			expect(result.setAside).toEqual([]);
			expect(result.parameters).toEqual({ channel: value });
		});

		it('should set aside a resourceLocator value on a string parameter', () => {
			const value = { __rl: true, mode: 'id', value: 'C1' };
			const result = carry(node(1, { channel: value }), desc(1, [locator]), desc(2, [text]), 2);

			expect(names(result)).toEqual(['channel']);
		});

		it('should keep a number on a string parameter', () => {
			const type = desc(1, [text]);
			const result = carry(node(1, { channel: 5 }), type, type, 1);

			expect(result.setAside).toEqual([]);
			expect(result.parameters).toEqual({ channel: 5 });
		});
	});

	describe('options list', () => {
		it('should keep a value that is not in the list when the parameter allows arbitrary values', () => {
			const type = desc(1, [
				{
					displayName: 'Model',
					name: 'model',
					type: 'options',
					allowArbitraryValues: true,
					options: [{ name: 'A', value: 'a' }],
					default: 'a',
				},
			]);
			const result = carry(node(1, { model: 'custom' }), type, type, 1);

			expect(result.setAside).toEqual([]);
			expect(result.parameters).toEqual({ model: 'custom' });
		});

		it('should set aside an option that the target version hides', () => {
			const type = desc(
				[1, 2],
				[
					{
						displayName: 'Mode',
						name: 'mode',
						type: 'options',
						options: [
							{ name: 'New', value: 'new' },
							{ name: 'Old', value: 'old', displayOptions: { show: { '@version': [1] } } },
						],
						default: 'new',
					},
				],
			);
			const result = carry(node(1, { mode: 'old' }), type, type, 2);

			expect(names(result)).toEqual(['mode']);
		});

		it('should check a parameter that a hidden parameter displays', () => {
			const type = desc(1, [
				{
					displayName: 'A',
					name: 'a',
					type: 'hidden',
					default: 'a',
					displayOptions: { show: { '@version': [99] } },
				},
				{
					displayName: 'B',
					name: 'b',
					type: 'options',
					options: [{ name: 'Kept', value: 'kept' }],
					default: 'kept',
					displayOptions: { show: { a: ['a'] } },
				},
			]);
			const result = carry(node(1, { b: 'gone' }), type, type, 1);

			expect(names(result)).toEqual(['b']);
		});
	});

	describe('resourceMapper value without a schema', () => {
		it('should keep the value', () => {
			const type = desc(1, [
				{
					displayName: 'Fields',
					name: 'fields',
					type: 'resourceMapper',
					default: { mappingMode: 'defineBelow', value: null },
				},
			]);
			const value = { mappingMode: 'autoMapInputData', value: null };
			const result = carry(node(1, { fields: value }), type, type, 1);

			expect(result.setAside).toEqual([]);
			expect(result.parameters).toEqual({ fields: value });
		});
	});

	describe('item of a collection with multiple values', () => {
		it('should set aside the fields that the target does not accept', () => {
			const type = desc(1, [
				{
					displayName: 'Items',
					name: 'items',
					type: 'collection',
					typeOptions: { multipleValues: true },
					default: [],
					options: [
						{
							displayName: 'Kind',
							name: 'k',
							type: 'options',
							options: [{ name: 'New', value: 'new' }],
							default: 'new',
						},
						{ displayName: 'Label', name: 'label', type: 'string', default: '' },
					],
				},
			]);
			const result = carry(
				node(1, { items: [{ k: 'legacy', junk: 1, label: 'x' }] }),
				type,
				type,
				1,
			);

			expect(result.setAside).toEqual([
				{ name: 'items[0].k', path: ['items', 0, 'k'], displayName: 'Kind', value: 'legacy' },
				{
					name: 'items[0].junk',
					path: ['items', 0, 'junk'],
					displayName: 'items[0].junk',
					value: 1,
				},
			]);
			expect(result.parameters).toEqual({ items: [{ label: 'x' }] });
		});
	});

	describe('collection with multiple values and an item that is not a record', () => {
		it('should set aside the list', () => {
			const type = desc(1, [
				{
					displayName: 'Items',
					name: 'items',
					type: 'collection',
					typeOptions: { multipleValues: true },
					default: [],
					options: [{ displayName: 'Label', name: 'label', type: 'string', default: '' }],
				},
			]);
			const items = [{ label: 'x' }, 5] as INodeParameters[];
			const result = carry(node(1, { items }), type, type, 1);

			expect(result.setAside).toEqual([
				{ name: 'items', path: ['items'], displayName: 'Items', value: items },
			]);
		});
	});

	describe('simple parameter with multiple values', () => {
		const type = desc(1, [
			{
				displayName: 'Tags',
				name: 'tags',
				type: 'string',
				typeOptions: { multipleValues: true },
				default: [],
			},
			{
				displayName: 'Limits',
				name: 'limits',
				type: 'number',
				typeOptions: { multipleValues: true },
				default: [],
			},
			{
				displayName: 'Kinds',
				name: 'kinds',
				type: 'options',
				typeOptions: { multipleValues: true },
				options: [
					{ name: 'A', value: 'a' },
					{ name: 'B', value: 'b' },
				],
				default: [],
			},
		]);

		it('should keep a list of valid values', () => {
			const parameters = { tags: ['x', '={{ $json.tag }}'], limits: [1, 2], kinds: ['a', 'b'] };
			const result = carry(node(1, parameters), type, type, 1);

			expect(result.setAside).toEqual([]);
			expect(result.parameters).toEqual(parameters);
		});

		it('should set aside a list with an entry that the target does not accept', () => {
			const result = carry(
				node(1, { tags: ['x'], limits: [1, 'two'], kinds: ['a', 'removed'] }),
				type,
				type,
				1,
			);

			expect(names(result)).toEqual(['limits', 'kinds']);
			expect(result.parameters).toEqual({ tags: ['x'] });
		});

		it('should set aside a value that is not a list', () => {
			const result = carry(node(1, { tags: 'x' }), type, type, 1);

			expect(names(result)).toEqual(['tags']);
		});
	});

	describe('dependent value with a definition that does not depend on the removed value', () => {
		it('should keep the value', () => {
			const limit = (displayOptions?: INodeProperties['displayOptions']): INodeProperties => ({
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				default: 50,
				displayOptions,
			});
			const mode = (values: string[]): INodeProperties => ({
				displayName: 'Mode',
				name: 'mode',
				type: 'options',
				options: values.map((value) => ({ name: value, value })),
				default: 'all',
			});
			const current = desc(1, [mode(['all', 'legacy']), limit()]);
			const target = desc(2, [
				mode(['all', 'some']),
				limit({ show: { mode: ['some'] } }),
				limit({ show: { '@version': [2] } }),
			]);
			const result = carry(node(1, { mode: 'legacy', limit: 10 }), current, target, 2);

			expect(names(result)).toEqual(['mode']);
			expect(result.parameters).toEqual({ limit: 10 });
		});
	});

	describe('result values', () => {
		it('should not share a changed default with the node type description', () => {
			const multi = (value: string): INodeProperties => ({
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				options: [
					{ name: 'A', value: 'a' },
					{ name: 'B', value: 'b' },
				],
				default: [value],
			});
			const target = desc(2, [multi('b')]);
			const result = carry(node(1, {}), desc(1, [multi('a')]), target, 2);

			expect(result.changedDefaults[0].newDefault).toEqual(['b']);
			expect(result.changedDefaults[0].newDefault).not.toBe(target.properties[0].default);
		});
	});
});
