import type { INodeProperties } from 'n8n-workflow';

export const optionsCollection: INodeProperties = {
	displayName: 'Options',
	name: 'options',
	type: 'collection',
	placeholder: 'Add Field',
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
			displayName: 'Mode',
			name: 'mode',
			type: 'options',
			noDataExpression: true,
			options: [
				{
					name: 'Independently',
					value: 'independently',
					description: 'Execute each query independently',
				},
				{
					name: 'Multiple Queries',
					value: 'multiple',
					description: '<b>Default</b>. Sends multiple queries at once to database.',
				},
				{
					name: 'Transaction',
					value: 'transaction',
					description: 'Executes all queries in a single transaction',
				},
			],
			default: 'multiple',
			description:
				'The way queries should be sent to database. Can be used in conjunction with <b>Continue on Fail</b>. See <a href="https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.postgres/">the docs</a> for more examples',
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
			displayOptions: {
				show: {
					'/operation': ['executeQuery'],
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
	description: 'The table where to insert data to',
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
	displayName: 'Where',
	name: 'where',
	type: 'fixedCollection',
	typeOptions: {
		multipleValues: true,
	},
	placeholder: 'Add Where Clause',
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
					displayName: 'Condition',
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
							name: 'Like',
							value: 'LIKE',
						},
					],
					default: 'equal',
				},
				{
					displayName: 'Value',
					name: 'value',
					type: 'string',
					default: '',
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
