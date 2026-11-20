import type { INodeProperties } from 'n8n-workflow';

import { QQL_OPS } from '../../shared/operationScopes';

/** VMDR OT parameters. This plane filters with QQL and is the only one that sorts. */
export const otFilterProperties: INodeProperties[] = [
	{
		displayName: 'Filter Groups',
		name: 'filterGroups',
		type: 'fixedCollection',
		default: {},
		typeOptions: { multipleValues: true },
		description: 'Groups of QQL conditions. Rows inside a group are bracketed together.',
		displayOptions: { show: { operation: QQL_OPS } },
		options: [
			{
				name: 'filterGroups',
				displayName: 'Filter Group',
				values: [
					{
						displayName: 'Filters',
						name: 'filters',
						type: 'fixedCollection',
						default: {},
						typeOptions: { multipleValues: true },
						description: 'Conditions within this group',
						options: [
							{
								name: 'filters',
								displayName: 'Filter Row',
								values: [
									{
										displayName: 'Identifier',
										name: 'identifier',
										type: 'string',
										default: '',
										description: 'QQL token, for example asset.name or vulnerabilities.qid',
									},
									{
										displayName: 'Operator',
										name: 'operator',
										type: 'options',
										noDataExpression: true,
										default: ':',
										options: [
											{ name: 'Contains / Equals (:)', value: ':' },
											{ name: 'Greater Than (>)', value: '>' },
											{ name: 'Greater Than or Equal (>=)', value: '>=' },
											{ name: 'Is Not Null', value: 'is not null' },
											{ name: 'Is Null', value: 'is null' },
											{ name: 'Less Than (<)', value: '<' },
											{ name: 'Less Than or Equal (<=)', value: '<=' },
											{ name: 'Not Equal (!=)', value: '!=' },
										],
										description: 'Comparison to apply',
									},
									{
										displayName: 'Value',
										name: 'value',
										type: 'string',
										default: '',
										description: 'Value to compare against',
									},
									{
										displayName: 'Join',
										name: 'join',
										type: 'options',
										noDataExpression: true,
										options: [
											{ name: 'AND', value: 'AND' },
											{ name: 'OR', value: 'OR' },
										],
										default: 'AND',
										description: 'How this row joins to the next one',
									},
								],
							},
						],
					},
					{
						displayName: 'Join',
						name: 'join',
						type: 'options',
						noDataExpression: true,
						options: [
							{ name: 'AND', value: 'AND' },
							{ name: 'OR', value: 'OR' },
						],
						default: 'AND',
						description: 'How this group joins to the next one',
					},
				],
			},
		],
	},
	{
		displayName: 'Sorts',
		name: 'sorts',
		type: 'fixedCollection',
		default: {},
		typeOptions: { multipleValues: true },
		description: 'Sort order. Only the VMDR OT API supports sorting.',
		displayOptions: { show: { operation: QQL_OPS } },
		options: [
			{
				name: 'sorts',
				displayName: 'Sort Rule',
				values: [
					{
						displayName: 'Field',
						name: 'field',
						type: 'string',
						default: '',
						description: 'Field to sort on',
					},
					{
						displayName: 'Direction',
						name: 'direction',
						type: 'options',
						default: 'asc',
						options: [
							{ name: 'Ascending', value: 'asc' },
							{ name: 'Descending', value: 'desc' },
						],
						description: 'Sort direction',
					},
				],
			},
		],
	},
];
