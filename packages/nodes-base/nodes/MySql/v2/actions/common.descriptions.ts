import type { INodeProperties } from 'n8n-workflow';

export const tableRLC: INodeProperties = {
	displayName: 'Table',
	name: 'table',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			placeholder: 'Select a Table...',
			typeOptions: {
				searchListMethod: 'searchTables',
				searchable: true,
			},
		},
		{
			displayName: 'Name',
			name: 'name',
			type: 'string',
			placeholder: 'table_name',
		},
	],
};

export const optionsCollection: INodeProperties = {
	displayName: 'Options',
	name: 'options',
	type: 'collection',
	default: {},
	placeholder: 'Add Option',
	options: [
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
					description: 'Execute queries for all incoming items, then process the results',
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
		},
		{
			displayName: 'Query Parameters',
			name: 'queryReplacement',
			type: 'fixedCollection',
			typeOptions: {
				multipleValues: true,
			},
			default: [],
			placeholder: 'Add Query Parameter',
			description:
				'Values have to be of type number, bigint, string, boolean, Date and null. Arrays and Objects will be converted to string.',
			options: [
				{
					displayName: 'Values',
					name: 'values',
					values: [
						{
							displayName: 'Value',
							name: 'value',
							type: 'string',
							default: '',
							placeholder: 'e.g. queryParamValue',
						},
					],
				},
			],
			displayOptions: {
				show: {
					'/operation': ['executeQuery'],
				},
			},
		},
		{
			// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-multi-options
			displayName: 'Output Columns',
			name: 'outputColumns',
			type: 'multiOptions',
			description:
				'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
			typeOptions: {
				loadOptionsMethod: 'getColumnsMultiOptions',
				loadOptionsDependsOn: ['table.value'],
			},
			default: [],
			displayOptions: {
				show: { '/operation': ['select'] },
			},
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
			displayName: 'Priority',
			name: 'priority',
			type: 'options',
			options: [
				{
					name: 'Low Prioirity',
					value: 'LOW_PRIORITY',
					description:
						'Delays execution of the INSERT until no other clients are reading from the table',
				},
				{
					name: 'High Priority',
					value: 'HIGH_PRIORITY',
					description:
						'Overrides the effect of the --low-priority-updates option if the server was started with that option. It also causes concurrent inserts not to be used.',
				},
			],
			default: 'LOW_PRIORITY',
			description: 'Ignore any ignorable errors that occur while executing the INSERT statement',
			displayOptions: {
				show: {
					'/operation': ['insert'],
				},
			},
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
				// {
				// 	displayName: 'Operator',
				// 	name: 'operator',
				// 	type: 'options',
				// 	hint: 'How to combine with next clause, operator from last clause will be ignored',
				// 	options: [
				// 		{
				// 			name: 'AND',
				// 			value: 'AND',
				// 		},
				// 		{
				// 			name: 'OR',
				// 			value: 'OR',
				// 		},
				// 	],
				// 	default: 'AND',
				// },
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
