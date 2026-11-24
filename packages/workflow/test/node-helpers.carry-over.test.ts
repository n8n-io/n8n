import has from 'lodash/has';

import type {
	INode,
	INodeParameters,
	INodeProperties,
	INodeTypeDescription,
} from '../src/interfaces';
import { carryOverNodeParameters } from '../src/node-helpers';

const desc = (version: number | number[], properties: INodeProperties[]): INodeTypeDescription => ({
	displayName: 'Test',
	name: 'test',
	group: [],
	version,
	description: '',
	defaults: {},
	inputs: ['main'],
	outputs: ['main'],
	properties,
});

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
	for (const { name } of result.setAside) {
		expect(has(result.parameters, name)).toBe(false);
	}
	return result;
};

const names = (result: ReturnType<typeof carryOverNodeParameters>) =>
	result.setAside.map(({ name }) => name);

// packages/nodes-base/nodes/HttpRequest/V1/HttpRequestV1.node.ts
const httpRequestV1 = desc(1, [
	{
		displayName: 'Authentication',
		name: 'authentication',
		type: 'options',
		options: [
			{ name: 'Basic Auth', value: 'basicAuth' },
			{ name: 'Header Auth', value: 'headerAuth' },
			{ name: 'None', value: 'none' },
		],
		default: 'none',
	},
	{
		displayName: 'Request Method',
		name: 'requestMethod',
		type: 'options',
		options: [
			{ name: 'GET', value: 'GET' },
			{ name: 'POST', value: 'POST' },
		],
		default: 'GET',
	},
	{ displayName: 'URL', name: 'url', type: 'string', default: '', required: true },
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		options: [
			{ displayName: 'Batch Interval', name: 'batchInterval', type: 'number', default: 1000 },
			{ displayName: 'Batch Size', name: 'batchSize', type: 'number', default: 50 },
			{ displayName: 'Timeout', name: 'timeout', type: 'number', default: 10000 },
		],
	},
]);

// packages/nodes-base/nodes/HttpRequest/V3/Description.ts
const httpRequestV3 = desc(
	[3, 4, 4.1, 4.2],
	[
		{
			displayName: 'Method',
			name: 'method',
			type: 'options',
			options: [
				{ name: 'GET', value: 'GET' },
				{ name: 'POST', value: 'POST' },
			],
			default: 'GET',
		},
		{ displayName: 'URL', name: 'url', type: 'string', default: '', required: true },
		{
			displayName: 'Authentication',
			name: 'authentication',
			noDataExpression: true,
			type: 'options',
			options: [
				{ name: 'None', value: 'none' },
				{ name: 'Predefined Credential Type', value: 'predefinedCredentialType' },
				{ name: 'Generic Credential Type', value: 'genericCredentialType' },
			],
			default: 'none',
		},
		{
			displayName: 'Options',
			name: 'options',
			type: 'collection',
			placeholder: 'Add option',
			default: {},
			options: [
				{
					displayName: 'Batching',
					name: 'batching',
					placeholder: 'Add Batching',
					type: 'fixedCollection',
					typeOptions: { multipleValues: false },
					default: { batch: {} },
					options: [
						{
							displayName: 'Batching',
							name: 'batch',
							values: [
								{
									displayName: 'Items per Batch',
									name: 'batchSize',
									type: 'number',
									default: 50,
								},
								{
									displayName: 'Batch Interval (ms)',
									name: 'batchInterval',
									type: 'number',
									default: 1000,
								},
							],
						},
					],
				},
				{ displayName: 'Timeout', name: 'timeout', type: 'number', default: 10000 },
			],
		},
	],
);

const kafkaTopic: INodeProperties = {
	displayName: 'Topic',
	name: 'topic',
	type: 'string',
	default: '',
};
const kafkaAcks: INodeProperties = {
	displayName: 'Acks',
	name: 'acks',
	type: 'boolean',
	default: false,
};
const kafkaOptions = (options: INodeProperties[]): INodeProperties => ({
	displayName: 'Options',
	name: 'options',
	type: 'collection',
	default: {},
	placeholder: 'Add option',
	options,
});

// packages/nodes-base/nodes/Kafka/v1/KafkaV1.node.ts
const kafkaV1 = desc(1, [
	kafkaTopic,
	kafkaOptions([
		kafkaAcks,
		{ displayName: 'Compression', name: 'compression', type: 'boolean', default: false },
		{ displayName: 'Timeout', name: 'timeout', type: 'number', default: 30000 },
	]),
]);

// packages/nodes-base/nodes/Kafka/v2/KafkaV2.node.ts
const kafkaV2 = desc(2, [
	kafkaTopic,
	kafkaOptions([
		kafkaAcks,
		{
			displayName: 'Compression',
			name: 'compression',
			type: 'options',
			default: 'none',
			options: [
				{ name: 'GZIP', value: 'gzip' },
				{ name: 'Snappy', value: 'snappy' },
				{ name: 'None', value: 'none' },
			],
		},
		{ displayName: 'Timeout', name: 'timeout', type: 'number', default: 30000 },
	]),
]);

const switchV1Rules = (
	dataType: string,
	displayName: string,
	valueType: 'number' | 'string',
	operations: string[],
): INodeProperties[] => [
	{
		displayName: 'Value 1',
		name: 'value1',
		type: valueType,
		displayOptions: { show: { dataType: [dataType], mode: ['rules'] } },
		default: valueType === 'number' ? 0 : '',
	},
	{
		displayName: 'Routing Rules',
		name: 'rules',
		placeholder: 'Add Routing Rule',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		displayOptions: { show: { dataType: [dataType], mode: ['rules'] } },
		default: {},
		options: [
			{
				name: 'rules',
				displayName,
				values: [
					{
						displayName: 'Operation',
						name: 'operation',
						type: 'options',
						options: operations.map((value) => ({ name: value, value })),
						default: operations[0],
					},
					{
						displayName: 'Value 2',
						name: 'value2',
						type: valueType,
						default: valueType === 'number' ? 0 : '',
					},
					{ displayName: 'Output', name: 'output', type: 'number', default: 0 },
				],
			},
		],
	},
];

// packages/nodes-base/nodes/Switch/V1/SwitchV1.node.ts
const switchV1 = desc(1, [
	{
		displayName: 'Mode',
		name: 'mode',
		type: 'options',
		options: [
			{ name: 'Expression', value: 'expression' },
			{ name: 'Rules', value: 'rules' },
		],
		default: 'rules',
	},
	{
		displayName: 'Output',
		name: 'output',
		type: 'number',
		displayOptions: { show: { mode: ['expression'] } },
		default: 0,
	},
	{
		displayName: 'Data Type',
		name: 'dataType',
		type: 'options',
		displayOptions: { show: { mode: ['rules'] } },
		options: [
			{ name: 'Number', value: 'number' },
			{ name: 'String', value: 'string' },
		],
		default: 'number',
	},
	...switchV1Rules('number', 'Numbers', 'number', ['smaller', 'equal', 'larger']),
	...switchV1Rules('string', 'Strings', 'string', ['equal', 'contains']),
	{
		displayName: 'Fallback Output',
		name: 'fallbackOutput',
		type: 'options',
		displayOptions: { show: { mode: ['rules'] } },
		options: [
			{ name: 'None', value: -1 },
			{ name: '0', value: 0 },
			{ name: '1', value: 1 },
			{ name: '2', value: 2 },
			{ name: '3', value: 3 },
		],
		default: -1,
	},
]);

// packages/nodes-base/nodes/Switch/V3/SwitchV3.node.ts
const switchV3 = desc(
	[3, 3.1, 3.2, 3.3, 3.4, 3.5],
	[
		{
			displayName: 'Mode',
			name: 'mode',
			type: 'options',
			noDataExpression: true,
			options: [
				{ name: 'Rules', value: 'rules' },
				{ name: 'Expression', value: 'expression' },
			],
			default: 'rules',
		},
		{
			displayName: 'Number of Outputs',
			name: 'numberOutputs',
			type: 'number',
			noDataExpression: true,
			displayOptions: { show: { mode: ['expression'], '@version': [{ _cnd: { gte: 3.3 } }] } },
			default: 4,
		},
		{
			displayName: 'Number of Outputs',
			name: 'numberOutputs',
			type: 'number',
			displayOptions: { show: { mode: ['expression'], '@version': [{ _cnd: { lt: 3.3 } }] } },
			default: 4,
		},
		{
			displayName: 'Output Index',
			name: 'output',
			type: 'number',
			validateType: 'number',
			displayOptions: { show: { mode: ['expression'] } },
			default: '={{}}',
		},
		{
			displayName: 'Routing Rules',
			name: 'rules',
			placeholder: 'Add Routing Rule',
			type: 'fixedCollection',
			typeOptions: { multipleValues: true, sortable: true },
			default: {
				values: [
					{
						conditions: {
							options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' },
							conditions: [
								{
									leftValue: '',
									rightValue: '',
									operator: { type: 'string', operation: 'equals' },
								},
							],
							combinator: 'and',
						},
					},
				],
			},
			displayOptions: { show: { mode: ['rules'] } },
			options: [
				{
					name: 'values',
					displayName: 'Routing Rule',
					values: [
						{
							displayName: 'Conditions',
							name: 'conditions',
							placeholder: 'Add Condition',
							type: 'filter',
							default: {},
							typeOptions: { multipleValues: false },
						},
						{
							displayName: 'Rename Output',
							name: 'renameOutput',
							type: 'boolean',
							default: false,
						},
						{
							displayName: 'Output Name',
							name: 'outputKey',
							type: 'string',
							default: '',
							displayOptions: { show: { renameOutput: [true] } },
						},
					],
				},
			],
		},
		{
			displayName: 'Convert types where required',
			name: 'looseTypeValidation',
			type: 'boolean',
			default: false,
			displayOptions: { show: { '@version': [{ _cnd: { gte: 3.1 } }] } },
		},
		{
			displayName: 'Options',
			name: 'options',
			type: 'collection',
			placeholder: 'Add option',
			default: {},
			displayOptions: { show: { mode: ['rules'] } },
			options: [
				{
					displayName: 'Fallback Output',
					name: 'fallbackOutput',
					type: 'options',
					typeOptions: { loadOptionsMethod: 'getFallbackOutputOptions' },
					default: 'none',
				},
				{ displayName: 'Ignore Case', name: 'ignoreCase', type: 'boolean', default: true },
			],
		},
	],
);

// packages/nodes-base/nodes/If/V1/IfV1.node.ts
const ifV1 = desc(1, [
	{
		displayName: 'Conditions',
		name: 'conditions',
		placeholder: 'Add Condition',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		default: {},
		options: [
			{
				name: 'boolean',
				displayName: 'Boolean',
				values: [
					{ displayName: 'Value 1', name: 'value1', type: 'boolean', default: false },
					{ displayName: 'Value 2', name: 'value2', type: 'boolean', default: false },
				],
			},
			{
				name: 'string',
				displayName: 'String',
				values: [
					{ displayName: 'Value 1', name: 'value1', type: 'string', default: '' },
					{
						displayName: 'Operation',
						name: 'operation',
						type: 'options',
						options: [
							{ name: 'Contains', value: 'contains' },
							{ name: 'Equal', value: 'equal' },
						],
						default: 'equal',
					},
					{ displayName: 'Value 2', name: 'value2', type: 'string', default: '' },
				],
			},
		],
	},
	{
		displayName: 'Combine',
		name: 'combineOperation',
		type: 'options',
		options: [
			{ name: 'ALL', value: 'all' },
			{ name: 'ANY', value: 'any' },
		],
		default: 'all',
	},
]);

// packages/nodes-base/nodes/If/V2/IfV2.node.ts
const ifV2 = desc(
	[2, 2.1, 2.2, 2.3, 2.4],
	[
		{
			displayName: 'Conditions',
			name: 'conditions',
			placeholder: 'Add Condition',
			type: 'filter',
			default: {},
		},
		{
			displayName: 'Convert types where required',
			name: 'looseTypeValidation',
			type: 'boolean',
			default: false,
			displayOptions: { show: { '@version': [{ _cnd: { gte: 2.1 } }] } },
		},
		{
			displayName: 'Options',
			name: 'options',
			type: 'collection',
			placeholder: 'Add option',
			default: {},
			options: [{ displayName: 'Ignore Case', name: 'ignoreCase', type: 'boolean', default: true }],
		},
	],
);

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
					{ name: 'requestMethod', displayName: 'Request Method', value: 'POST' },
					{ name: 'authentication', displayName: 'Authentication', value: 'basicAuth' },
					{ name: 'options.batchSize', displayName: 'Batch Size', value: 10 },
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
				setAside: [{ name: 'options.compression', displayName: 'Compression', value: true }],
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
					{ name: 'dataType', displayName: 'Data Type', value: 'string' },
					{ name: 'value1', displayName: 'Value 1', value: '={{ $json.a }}' },
					{ name: 'rules.rules', displayName: 'Strings', value: rules },
					{ name: 'fallbackOutput', displayName: 'Fallback Output', value: 3 },
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
					{ name: 'resource', displayName: 'Resource', value: 'file' },
					{ name: 'operation', displayName: 'Operation', value: 'upload' },
				],
				changedDefaults: [],
				issues: null,
			});
		});

		it('should keep an operation that the default resource offers', () => {
			const result = carry(node(1, { resource: 'file', operation: 'delete' }), current, target, 2);

			expect(result).toEqual({
				parameters: { operation: 'delete' },
				setAside: [{ name: 'resource', displayName: 'Resource', value: 'file' }],
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
					{ name: 'conditions', displayName: 'Conditions', value: conditions },
					{ name: 'combineOperation', displayName: 'Combine', value: 'any' },
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

		it('should set aside a string on a resourceMapper parameter', () => {
			const result = carry(node(1, { columns: 'id' }), type, type, 1);

			expect(result.setAside).toEqual([{ name: 'columns', displayName: 'Columns', value: 'id' }]);
		});

		it('should set aside a record without assignments on an assignmentCollection parameter', () => {
			const result = carry(node(1, { assignments: { values: [] } }), type, type, 1);

			expect(result.setAside).toEqual([
				{ name: 'assignments', displayName: 'Assignments', value: { values: [] } },
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
				{ name: 'resource', displayName: 'Resource', value: '={{ $json.r }}' },
			]);
			expect(result.parameters).toEqual({});
		});

		it('should set aside an expression on a string parameter one time', () => {
			const result = carry(node(1, { name: '={{ $json.n }}' }), loose, strict, 1);

			expect(result.setAside).toEqual([
				{ name: 'name', displayName: 'Name', value: '={{ $json.n }}' },
			]);
			expect(result.parameters).toEqual({});
		});

		it('should set aside an expression on a collection child', () => {
			const result = carry(node(1, { opts: { inner: '={{ 1 }}' } }), loose, strict, 1);

			expect(result.setAside).toEqual([
				{ name: 'opts.inner', displayName: 'Inner', value: '={{ 1 }}' },
			]);
		});

		it('should keep a lone $fromAI placeholder', () => {
			const result = carry(node(1, { name: "={{ $fromAI('x') }}" }), loose, strict, 1);

			expect(result.setAside).toEqual([]);
			expect(result.parameters).toEqual({ name: "={{ $fromAI('x') }}" });
		});

		it('should keep a dependent value when the old version also has noDataExpression', () => {
			const result = carry(
				node(1, { resource: '={{ $json.r }}', operation: 'delete' }),
				strict,
				strict,
				1,
			);

			expect(names(result)).toEqual(['resource']);
			expect(result.parameters).toEqual({ operation: 'delete' });
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
				{ name: 'events', displayName: 'Events', value: ['created', 'archived'] },
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
				{ name: 'fc.values[0].kind', displayName: 'Kind', value: 'legacy' },
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
				{ name: 'operation', displayName: 'Operation', value: 'gone' },
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
				{ name: 'options.verifyTls', displayName: 'options.verifyTls', value: 'junk' },
				{ name: 'fc.group[0].a', displayName: 'fc.group[0].a', value: 'junk' },
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
				{ name: 'fc.group', displayName: 'Group', value: { a: 1 } },
			]);
			expect(result.parameters).toEqual({});
		});

		it('should set aside an array on a group that takes one value', () => {
			const result = carry(node(1, { fc: { group: [{ a: 1 }] } }), multiple, single, 1);

			expect(result.setAside).toEqual([
				{ name: 'fc.group', displayName: 'Group', value: [{ a: 1 }] },
			]);
			expect(result.parameters).toEqual({ fc: {} });
		});

		it.each([null, 'abc', 5])('should set aside the group value %j', (group) => {
			const result = carry(node(1, { fc: { group } }), multiple, multiple, 1);

			expect(result.setAside).toEqual([{ name: 'fc.group', displayName: 'Group', value: group }]);
			expect(result.parameters).toEqual({});
		});

		it('should set aside a wrong group value in a nested fixedCollection', () => {
			const result = carry(node(1, { options: { fc: { group: null } } }), nested, nested, 1);

			// `getNodeParameters` drops the empty fixedCollection, so the diff stops one level up.
			expect(result.setAside).toEqual([
				{ name: 'options.fc', displayName: 'Fields', value: { group: null } },
			]);
			expect(result.parameters).toEqual({ options: {} });
		});

		it('should set aside a string on a collection and a number on a fixedCollection', () => {
			const type = desc(1, [...nested.properties, fc(true)]);
			const result = carry(node(1, { options: 'abc', fc: 5 }), type, type, 1);

			expect(result.setAside).toEqual([
				{ name: 'options', displayName: 'Options', value: 'abc' },
				{ name: 'fc', displayName: 'Fields', value: 5 },
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
				setAside: [{ name: 'legacy', displayName: 'Legacy', value: 'x' }],
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

			expect(result.setAside).toEqual([{ name: 'f', displayName: 'Filter', value: f }]);
			expect(result.parameters).toEqual({});
		});

		it.each([[5], [[null]]])(
			'should set aside a resourceMapper value with the schema %j',
			(schema) => {
				const r = { mappingMode: 'defineBelow', value: { a: 1 }, schema, matchingColumns: [] };
				const result = carry(node(1, { r } as unknown as INodeParameters), type, type, 1);

				expect(result.setAside).toEqual([{ name: 'r', displayName: 'Columns', value: r }]);
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

			expect(result.setAside).toEqual([{ name: 'items', displayName: 'Items', value: { a: 'x' } }]);
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
				{ name: 'flag', displayName: 'Flag', value: 'on' },
				{ name: 'n', displayName: 'N', value: '5' },
			]);
			expect(result.parameters).toEqual({});
		});
	});
});
