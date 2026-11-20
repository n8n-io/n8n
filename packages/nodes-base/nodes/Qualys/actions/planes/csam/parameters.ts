import type { INodeProperties } from 'n8n-workflow';

import { COMPONENT_OPS, CRITERIA_OPS, CSAM_OPS, GET_OPS } from '../../shared/operationScopes';

/**
 * CyberSecurity Asset Management parameters. This plane filters with a
 * structured criteria document rather than a query string.
 */
const CSAM_OPERATORS = [
	{ name: 'Contains', value: 'CONTAINS' },
	{ name: 'Equals', value: 'EQUALS' },
	{ name: 'Greater Than', value: 'GREATER' },
	{ name: 'Greater Than or Equal', value: 'GREATER_THAN_EQUAL' },
	{ name: 'In (Comma-Separated)', value: 'IN' },
	{ name: 'Less Than', value: 'LESSER' },
	{ name: 'Less Than or Equal', value: 'LESS_THAN_EQUAL' },
	{ name: 'Not Equals', value: 'NOT_EQUALS' },
];

export const csamProperties: INodeProperties[] = [
	{
		displayName: 'Asset ID',
		name: 'assetId',
		type: 'string',
		default: '',
		required: true,
		description: 'Numeric asset ID to fetch',
		displayOptions: { show: { operation: GET_OPS } },
	},
	{
		displayName: 'Match',
		name: 'csamMatch',
		type: 'options',
		default: 'AND',
		options: [
			{ name: 'All Conditions (AND)', value: 'AND' },
			{ name: 'Any Condition (OR)', value: 'OR' },
		],
		description:
			'How the filter conditions combine. The Asset Management API applies one operator to the whole list; it does not support nested groups.',
		displayOptions: { show: { operation: [...CRITERIA_OPS, ...COMPONENT_OPS] } },
	},
	{
		displayName: 'Filters',
		name: 'csamFilters',
		type: 'fixedCollection',
		default: {},
		typeOptions: { multipleValues: true },
		description: 'Conditions applied to the search',
		displayOptions: { show: { operation: [...CRITERIA_OPS, ...COMPONENT_OPS] } },
		options: [
			{
				name: 'filters',
				displayName: 'Filter',
				values: [
					{
						displayName: 'Field',
						name: 'field',
						type: 'string',
						default: '',
						placeholder: 'operatingSystem.category1',
						description:
							'Asset Management token, for example asset.name, software.product or operatingSystem.lifecycle.eol. On Software Components, fields starting with component. filter the component and the rest filter the asset. Using an operator the field does not support returns HTTP 400.',
					},
					{
						displayName: 'Operator',
						name: 'operator',
						type: 'options',
						default: 'CONTAINS',
						options: CSAM_OPERATORS,
						description: 'Comparison to apply. Must match the field type.',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
						description: 'Value to compare against',
					},
				],
			},
		],
	},
	{
		displayName: 'Additional Fields',
		name: 'csamOptions',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { operation: CSAM_OPS } },
		options: [
			{
				displayName: 'Exclude Fields',
				name: 'excludeFields',
				type: 'string',
				default: '',
				placeholder: 'software,openPort',
				description: 'Comma-separated fields to blank out. They are returned as null.',
			},
			{
				displayName: 'Include Fields',
				name: 'includeFields',
				type: 'string',
				default: '',
				placeholder: 'operatingSystem,hardware',
				description:
					'Comma-separated fields to populate. All other fields are still present but returned as null.',
			},
			{
				displayName: 'Page Size',
				name: 'pageSize',
				type: 'number',
				default: 100,
				typeOptions: { minValue: 1, maxValue: 1000, numberPrecision: 0 },
				description:
					'Records per API call. The maximum is 300 for assets and domains, 1000 for software components.',
			},
			{
				displayName: 'Software Type',
				name: 'softwareType',
				type: 'options',
				default: 'Application',
				options: [
					{ name: 'Application', value: 'Application' },
					{ name: 'Others', value: 'Others' },
					{ name: 'Unknown', value: 'Unknown' },
				],
				description: 'Restrict software details to one type',
			},
			{
				displayName: 'Updated After',
				name: 'assetLastUpdated',
				type: 'dateTime',
				default: '',
				description:
					'Only assets modified on or after this moment. The natural key for incremental syncs.',
			},
		],
	},
];
