import type { INodeProperties, INodeTypeDescription } from '../../src/interfaces';

export const desc = (
	version: number | number[],
	properties: INodeProperties[],
): INodeTypeDescription => ({
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

// packages/nodes-base/nodes/HttpRequest/V1/HttpRequestV1.node.ts
export const httpRequestV1 = desc(1, [
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
export const httpRequestV3 = desc(
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
export const kafkaV1 = desc(1, [
	kafkaTopic,
	kafkaOptions([
		kafkaAcks,
		{ displayName: 'Compression', name: 'compression', type: 'boolean', default: false },
		{ displayName: 'Timeout', name: 'timeout', type: 'number', default: 30000 },
	]),
]);

// packages/nodes-base/nodes/Kafka/v2/KafkaV2.node.ts
export const kafkaV2 = desc(2, [
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
export const switchV1 = desc(1, [
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
export const switchV3 = desc(
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
export const ifV1 = desc(1, [
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
export const ifV2 = desc(
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
