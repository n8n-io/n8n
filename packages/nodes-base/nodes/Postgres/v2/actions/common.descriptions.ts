import type { INodeProperties } from 'n8n-workflow';

export const optionsCollection: INodeProperties = {
	displayName: 'Options',
	name: 'options',
	type: 'collection',
	placeholder: 'Add Option',
	default: {},
	options: [
		{
			displayName: 'Cascade',
			name: 'cascade',
			type: 'boolean',
			default: false,
			description:
				'Whether to drop all objects that depend on the table, such as views and sequences',
			displayOptions: {
				show: {
					'/operation': ['deleteTable'],
				},
				hide: {
					'/deleteCommand': ['delete'],
				},
			},
		},
		{
			displayName: 'Connection Timeout',
			name: 'connectionTimeoutMillis',
			type: 'number',
			default: 0,
			description: 'Number of milliseconds reserved for connecting to the database',
		},
		{
			displayName: 'Query Batching',
			name: 'queryBatching',
			type: 'options',
			noDataExpression: true,
			options: [
				{
					name: 'Multiple Queries',
					value: 'multiple',
					description: 'A single query for all incoming items',
				},
				{
					name: 'Independently',
					value: 'independently',
					description: 'Execute one query per incoming item',
				},
				{
					name: 'Transaction',
					value: 'transaction',
					description:
						'Execute all queries in a transaction, if a failure occurs, all changes are rolled back',
				},
			],
			default: 'multiple',
			description:
				'The way queries should be sent to the database. <a href="https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.postgres/">More info.</a>.',
		},
		{
			displayName: 'Output Large-Format Numbers As',
			name: 'largeNumbersOutput',
			type: 'options',
			options: [
				{
					name: 'Numbers',
					value: 'numbers',
				},
				{
					name: 'Text',
					value: 'text',
					description:
						'Use this if you expect numbers longer than 16 digits (otherwise numbers may be incorrect)',
				},
			],
			hint: 'Applies to NUMERIC and BIGINT columns only',
			default: 'text',
		},
		{
			displayName: 'Skip on Conflict',
			name: 'skipOnConflict',
			type: 'boolean',
			default: false,
			description:
				'Whether to skip the row and do not throw error if a unique constraint or exclusion constraint is violated',
			displayOptions: {
				show: {
					'/operation': ['insert'],
				},
			},
		},
	],
};

export const schemaRLC: INodeProperties = {
	displayName: 'Schema',
	name: 'schema',
	type: 'resourceLocator',
	default: { mode: 'list', value: 'public' },
	required: true,
	placeholder: 'e.g. public',
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
					description:
						'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
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
					],
					default: 'equal',
				},
				{
					displayName: 'Value',
					name: 'value',
					type: 'string',
					default: '',
					placeholder: 'e.g. 1234',
					displayOptions: {
						show: {
							condition: ['equal', '!='],
						},
					},
				},
				{
					displayName: 'Value',
					name: 'value',
					type: 'string',
					default: '',
					placeholder: 'e.g. Jen%',
					hint: 'Percent sign ( %) matches zero or more characters, underscore ( _ ) matches any single character',
					displayOptions: {
						show: {
							condition: ['LIKE'],
						},
					},
				},
				{
					displayName: 'Value',
					name: 'value',
					type: 'number',
					default: 0,
					displayOptions: {
						show: {
							condition: ['>', '<', '>=', '<='],
						},
					},
				},
				{
					displayName: 'Operator',
					name: 'operator',
					type: 'options',
					hint: 'How to combine with next clause, operator from last clause will be ignored',
					options: [
						{
							name: 'AND',
							value: 'AND',
						},
						{
							name: 'OR',
							value: 'OR',
						},
					],
					default: 'AND',
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
					description:
						'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
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

export const outpurSelector: INodeProperties[] = [
	{
		displayName: 'Output',
		name: 'output',
		type: 'options',
		default: 'all',
		options: [
			{
				name: 'All Columns',
				value: 'all',
				description: 'All columns in the table',
			},
			{
				name: 'Selected Columns',
				value: 'columns',
				description: 'Only selected columns in the table',
			},
		],
	},
	{
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-multi-options
		displayName: 'Columns',
		name: 'returnColumns',
		type: 'multiOptions',
		description:
			'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
		typeOptions: {
			loadOptionsMethod: 'getColumns',
			loadOptionsDependsOn: ['schema.value', 'table.value'],
		},
		default: [],
		displayOptions: {
			show: {
				output: ['columns'],
			},
		},
	},
];
