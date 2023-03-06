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
			name: 'returnColumns',
			type: 'multiOptions',
			description:
				'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
			typeOptions: {
				loadOptionsMethod: 'getColumnsMultiOptions',
				loadOptionsDependsOn: ['table.value'],
			},
			default: [],
			displayOptions: {
				hide: { '/operation': ['select'] },
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
