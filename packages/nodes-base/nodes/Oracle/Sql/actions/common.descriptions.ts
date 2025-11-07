import type { INodeProperties } from 'n8n-workflow';

const stmtBatchOptions = [
	{
		name: 'Single Statement',
		value: 'single',
		description: 'A single Statement for all incoming items',
	},
	{
		name: 'Independently',
		value: 'independently',
		description: 'Execute one Statement per incoming item of the run',
	},
	{
		name: 'Transaction',
		value: 'transaction',
		description:
			'Execute all Statements in a transaction, if a failure occurs, all changes are rolled back',
	},
];

export const optionsCollection: INodeProperties[] = [
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		options: [
			{
				displayName: 'Auto Commit',
				name: 'autoCommit',
				type: 'boolean',
				default: true,
				description:
					'Whether this property is true, then the transaction in the current connection is automatically committed at the end of statement execution',
			},
			{
				displayName: 'Bind Variable Placeholder Values',
				name: 'params',
				placeholder: 'Add Parameter',
				type: 'fixedCollection',
				typeOptions: {
					multipleValueButtonText: 'Add another Parameter',
					multipleValues: true,
				},
				displayOptions: {
					show: {
						'/operation': ['execute'],
					},
				},
				default: {},
				description: 'Enter the values for the bind parameters used in the statement',
				options: [
					{
						displayName: 'Values',
						name: 'values',
						values: [
							{
								displayName: 'Bind Name or Number',
								name: 'name',
								type: 'string',
								default: '',
								description: 'A bind variable placeholder identifier or numeral',
								placeholder:
									'e.g. ``dept_id`` and ``dept_name`` are the two bind variables placeholders in this SQL statement',
								required: true,
							},
							{
								displayName: 'Bind Direction',
								name: 'bindDirection',
								type: 'options',
								default: 'in',
								required: true,
								description:
									'Specify whether data values bound to SQL or PL/SQL bind parameters are passed into, or out from, the database',
								options: [
									{ name: 'IN', value: 'in' },
									{ name: 'OUT', value: 'out' },
									{ name: 'IN-OUT', value: 'inout' },
								],
							},
							{
								displayName: 'Data Type',
								name: 'datatype',
								type: 'options',
								required: true,
								default: 'string',
								options: [
									{ name: 'BLOB', value: 'blob' },
									{ name: 'Boolean', value: 'boolean' },
									{ name: 'Date', value: 'date' },
									{ name: 'JSON', value: 'json' },
									{ name: 'Number', value: 'number' },
									{ name: 'SparseVector', value: 'sparse' },
									{ name: 'String', value: 'string' },
									{ name: 'Vector', value: 'vector' },
								],
							},
							{
								displayName: 'Value (String)',
								name: 'valueString',
								type: 'string',
								default: '',
								displayOptions: {
									show: {
										datatype: ['string'],
									},
								},
							},
							{
								displayName: 'Value (Number)',
								name: 'valueNumber',
								type: 'number',
								default: 0,
								displayOptions: {
									show: {
										datatype: ['number'],
									},
								},
							},
							{
								displayName: 'Value (Date)',
								name: 'valueDate',
								type: 'dateTime',
								default: 0,
								displayOptions: {
									show: {
										datatype: ['date'],
									},
								},
							},
							{
								displayName: 'Value (Boolean)',
								name: 'valueBoolean',
								type: 'boolean',
								default: false,
								displayOptions: {
									show: {
										datatype: ['boolean'],
									},
								},
							},
							{
								displayName: 'Value (JSON)',
								name: 'valueJson',
								type: 'json',
								default: '{}',
								displayOptions: {
									show: {
										datatype: ['json'],
									},
								},
							},
							{
								displayName: 'Value (VECTOR)',
								name: 'valueVector',
								type: 'json',
								default: '[]',
								displayOptions: {
									show: {
										datatype: ['vector'],
									},
								},
								placeholder: '[1.2, 3.4, 5.6]',
								description: 'A JSON array of dimension values',
							},
							{
								displayName: 'Value (BLOB)',
								name: 'valueBlob',
								type: 'json',
								default: '[]',
								displayOptions: {
									show: {
										datatype: ['blob'],
									},
								},
								placeholder: '{ "type": "Buffer", "data": [98,10] }',
								description: 'A Binary data',
							},
							{
								displayName: 'Value (Sparse Vector)',
								name: 'valueSparse',
								type: 'collection',
								default: {},
								displayOptions: {
									show: {
										datatype: ['sparse'],
									},
								},
								options: [
									{
										displayName: 'Dimensions',
										name: 'dimensions',
										type: 'number',
										default: 0,
										description: 'Total number of dimensions',
									},
									{
										displayName: 'Indices',
										name: 'indices',
										type: 'json',
										default: '[]',
										placeholder: '[0, 2, 5]',
										description: 'A JSON array of indices, e.g., [0, 2, 5]',
									},
									{
										displayName: 'Values',
										name: 'values',
										type: 'json',
										default: '[]',
										placeholder: '[1.2, 3.4, 5.6]',
										description: 'A JSON array of values matching indices',
									},
								],
							},
							{
								displayName: 'Parse for IN Statement',
								name: 'parseInStatement',
								type: 'options',
								required: true,
								default: false,
								hint: 'If "Yes" the "Value" field should be a string of comma-separated values. i.e: 1,2,3 or str1,str2,str3',
								options: [
									{ name: 'No', value: false },
									{ name: 'Yes', value: true },
								],
							},
						],
					},
				],
			},
			{
				displayName: 'Fetch Array Size',
				name: 'fetchArraySize',
				type: 'number',
				default: 100,
				typeOptions: {
					minValue: 0,
				},
				displayOptions: {
					show: {
						'/operation': ['execute', 'select'],
					},
				},
				description:
					'This property is a number that sets the size of an internal buffer used for fetching query rows from Oracle Database. Changing it may affect query performance but does not affect how many rows are returned to the application.',
			},

			{
				displayName: 'Number of Rows to Prefetch',
				name: 'prefetchRows',
				type: 'number',
				default: 2,
				displayOptions: {
					show: {
						'/operation': ['execute', 'select'],
					},
				},
				typeOptions: {
					minValue: 0,
				},
				description:
					'This property is a query tuning option to set the number of additional rows the underlying Oracle driver fetches during the internal initial statement execution phase of a query',
			},
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-multi-options
				displayName: 'Output Columns',
				name: 'outputColumns',
				type: 'multiOptions',
				// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-dynamic-multi-options
				description:
					'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/" target="_blank">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getColumnsMultiOptions',
					loadOptionsDependsOn: ['table.value'],
				},
				default: [],
				displayOptions: {
					show: { '/operation': ['insert', 'select', 'update', 'upsert'] },
				},
			},
			{
				displayName: 'Output Numbers As String',
				name: 'largeNumbersOutputAsString',
				type: 'boolean',
				default: false,
				description: 'Whether the numbers should be retrieved as string',
				displayOptions: {
					show: {
						'/operation': ['execute', 'select'],
					},
				},
				hint: 'Applies to NUMBER, FLOAT, LONG type columns only',
			},
			{
				displayName: 'Statement Batching',
				name: 'stmtBatching',
				type: 'options',
				noDataExpression: true,
				options: stmtBatchOptions,
				default: 'single',
				displayOptions: {
					show: { '/operation': ['update', 'insert', 'upsert'] },
				},
				description: 'The way queries should be sent to the database',
			},
			{
				displayName: 'Statement Batching',
				name: 'stmtBatching',
				type: 'options',
				noDataExpression: true,
				options: stmtBatchOptions,
				default: 'independently',
				displayOptions: {
					show: { '/operation': ['deleteTable'] },
				},
				description: 'The way queries should be sent to the database',
			},
		],
	},
	{
		displayName: 'Important: Single Statement mode works only for the first item',
		name: 'stmtBatchingNotice',
		type: 'notice',
		default: '',
		displayOptions: {
			show: {
				'/options.stmtBatching': ['single'],
			},
		},
	},
];

export const schemaRLC: INodeProperties = {
	displayName: 'Schema',
	name: 'schema',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	placeholder: 'e.g. scott',
	description: 'The schema that contains the table you want to work on',
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			typeOptions: {
				searchListMethod: 'schemaSearch',
			},
		},
		{
			displayName: 'By Name',
			name: 'name',
			type: 'string',
		},
	],
};

export const tableRLC: INodeProperties = {
	displayName: 'Table',
	name: 'table',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	description: 'The table you want to work on',
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			typeOptions: {
				searchListMethod: 'tableSearch',
			},
		},
		{
			displayName: 'By Name',
			name: 'name',
			type: 'string',
		},
	],
};

export const whereFixedCollection: INodeProperties = {
	displayName: 'Select Rows',
	name: 'where',
	type: 'fixedCollection',
	typeOptions: {
		multipleValues: true,
	},
	placeholder: 'Add Condition',
	default: {},
	description: 'If not set, all rows will be selected',
	options: [
		{
			displayName: 'Values',
			name: 'values',
			values: [
				{
					// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
					displayName: 'Column',
					name: 'column',
					type: 'options',
					// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-dynamic-options
					description:
						'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/" target="_blank">expression</a>',
					default: '',
					placeholder: 'e.g. ID',
					typeOptions: {
						loadOptionsMethod: 'getColumns',
						loadOptionsDependsOn: ['schema.value', 'table.value'],
					},
				},
				{
					displayName: 'Operator',
					name: 'condition',
					type: 'options',
					description:
						"The operator to check the column against. When using 'LIKE' operator percent sign ( %) matches zero or more characters, underscore ( _ ) matches any single character.",
					// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
					options: [
						{
							name: 'Equal',
							value: 'equal',
						},
						{
							name: 'Not Equal',
							value: '!=',
						},
						{
							name: 'Like',
							value: 'LIKE',
						},
						{
							name: 'Greater Than',
							value: '>',
						},
						{
							name: 'Less Than',
							value: '<',
						},
						{
							name: 'Greater Than Or Equal',
							value: '>=',
						},
						{
							name: 'Less Than Or Equal',
							value: '<=',
						},
						{
							name: 'Is Null',
							value: 'IS NULL',
						},
						{
							name: 'Is Not Null',
							value: 'IS NOT NULL',
						},
					],
					default: 'equal',
				},
				{
					displayName: 'Value',
					name: 'value',
					type: 'json',
					description: 'Parameters to pass to the tool as JSON or string',
					displayOptions: {
						hide: {
							condition: ['IS NULL', 'IS NOT NULL'],
						},
					},
					default: '{"key": "val"}',
					placeholder: '{ "key": "value" }',
				},
			],
		},
	],
};

export const sortFixedCollection: INodeProperties = {
	displayName: 'Sort',
	name: 'sort',
	type: 'fixedCollection',
	typeOptions: {
		multipleValues: true,
	},
	placeholder: 'Add Sort Rule',
	default: {},
	options: [
		{
			displayName: 'Values',
			name: 'values',
			values: [
				{
					// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
					displayName: 'Column',
					name: 'column',
					type: 'options',
					// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-dynamic-options
					description:
						'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/" target="_blank">expression</a>',
					default: '',
					typeOptions: {
						loadOptionsMethod: 'getColumns',
						loadOptionsDependsOn: ['schema.value', 'table.value'],
					},
				},
				{
					displayName: 'Direction',
					name: 'direction',
					type: 'options',
					options: [
						{
							name: 'ASC',
							value: 'ASC',
						},
						{
							name: 'DESC',
							value: 'DESC',
						},
					],
					default: 'ASC',
				},
			],
		},
	],
};

export const combineConditionsCollection: INodeProperties = {
	displayName: 'Combine Conditions',
	name: 'combineConditions',
	type: 'options',
	description:
		'How to combine the conditions defined in "Select Rows": AND requires all conditions to be true, OR requires at least one condition to be true',
	options: [
		{
			name: 'AND',
			value: 'AND',
			description: 'Only rows that meet all the conditions are selected',
		},
		{
			name: 'OR',
			value: 'OR',
			description: 'Rows that meet at least one condition are selected',
		},
	],
	default: 'AND',
};
