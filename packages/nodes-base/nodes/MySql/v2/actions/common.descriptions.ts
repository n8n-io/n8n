import type { INodeProperties } from 'n8n-workflow';

import { BATCH_MODE, SINGLE } from '../helpers/interfaces';

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
	placeholder: 'Add option',
	options: [
		{
			displayName: 'Connection Timeout',
			name: 'connectionTimeoutMillis',
			type: 'number',
			default: 30,
			description: 'Number of milliseconds reserved for connecting to the database',
			typeOptions: {
				minValue: 1,
			},
		},
		{
			displayName: 'Connections Limit',
			name: 'connectionLimit',
			type: 'number',
			default: 10,
			typeOptions: {
				minValue: 1,
			},
			description:
				'Maximum amount of connections to the database, setting high value can lead to performance issues and potential database crashes',
		},
		{
			displayName: 'Query Batching',
			name: 'queryBatching',
			type: 'options',
			noDataExpression: true,
			description: 'The way queries should be sent to the database',
			options: [
				{
					name: 'Single Query',
					value: BATCH_MODE.SINGLE,
					description: 'A single query for all incoming items',
				},
				{
					name: 'Independent',
					value: BATCH_MODE.INDEPENDENTLY,
					description: 'Execute one query per incoming item of the run',
				},
				{
					name: 'Transaction',
					value: BATCH_MODE.TRANSACTION,
					description:
						'Execute all queries in a transaction, if a failure occurs, all changes are rolled back',
				},
			],
			default: SINGLE,
		},
		{
			displayName: 'Query Parameters',
			name: 'queryReplacement',
			type: 'string',
			default: '',
			placeholder: 'e.g. value1,value2,value3',
			description:
				'Comma-separated list of the values you want to use as query parameters. You can drag the values from the input panel on the left. <a href="https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.mysql/" target="_blank">More info</a>',
			hint: 'Comma-separated list of values: reference them in your query as $1, $2, $3…',
			displayOptions: {
				show: { '/operation': ['executeQuery'] },
			},
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
			displayOptions: {
				show: { '/operation': ['select', 'executeQuery'] },
			},
		},
		{
			displayName: 'Output Decimals as Numbers',
			name: 'decimalNumbers',
			type: 'boolean',
			default: false,
			description: 'Whether to output DECIMAL types as numbers instead of strings',
			displayOptions: {
				show: { '/operation': ['select', 'executeQuery'] },
			},
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
			displayName: 'Replace Empty Strings with NULL',
			name: 'replaceEmptyStrings',
			type: 'boolean',
			default: false,
			description:
				'Whether to replace empty strings with NULL in input, could be useful when data come from spreadsheet',
			displayOptions: {
				show: {
					'/operation': ['insert', 'update', 'upsert', 'executeQuery'],
				},
			},
		},
		{
			displayName: 'Select Distinct',
			name: 'selectDistinct',
			type: 'boolean',
			default: false,
			description: 'Whether to remove these duplicate rows',
			displayOptions: {
				show: {
					'/operation': ['select'],
				},
			},
		},
		{
			displayName: 'Output Query Execution Details',
			name: 'detailedOutput',
			type: 'boolean',
			default: false,
			description:
				'Whether to show in output details of the ofexecuted query for each statement, or just confirmation of success',
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

export const selectRowsFixedCollection: INodeProperties = {
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
					type: 'string',
					displayOptions: {
						hide: {
							condition: ['IS NULL', 'IS NOT NULL'],
						},
					},
					default: '',
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
