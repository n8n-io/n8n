import type { INodeProperties } from 'n8n-workflow';

export const secureScoreControlProfileOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['secureScoreControlProfile'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get a secure score control profile',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many secure score control profiles',
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a secure score control profile',
			},
		],
		default: 'get',
	},
];

export const secureScoreControlProfileFields: INodeProperties[] = [
	// ----------------------------------------
	//             secureScore: get
	// ----------------------------------------
	{
		displayName: 'Secure Score Control Profile ID',
		name: 'secureScoreControlProfileId',
		description: 'ID of the secure score control profile to retrieve',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['secureScoreControlProfile'],
				operation: ['get'],
			},
		},
	},

	// ----------------------------------------
	//    secureScoreControlProfile: getAll
	// ----------------------------------------
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: ['secureScoreControlProfile'],
				operation: ['getAll'],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		description: 'Max number of results to return',
		typeOptions: {
			minValue: 1,
			maxValue: 1000,
		},
		displayOptions: {
			show: {
				resource: ['secureScoreControlProfile'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		default: {},
		placeholder: 'Add Filter',
		displayOptions: {
			show: {
				resource: ['secureScoreControlProfile'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Filter Query Parameter',
				name: 'filter',
				description:
					'<a href="https://docs.microsoft.com/en-us/graph/query-parameters#filter-parameter">Query parameter</a> to filter results by',
				type: 'string',
				default: '',
				// eslint-disable-next-line n8n-nodes-base/node-param-placeholder-miscased-id
				placeholder: "startsWith(id, 'AATP')",
			},
		],
	},

	// ----------------------------------------
	//    secureScoreControlProfile: update
	// ----------------------------------------
	{
		displayName: 'Secure Score Control Profile ID',
		name: 'secureScoreControlProfileId',
		description: 'ID of the secure score control profile to update',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['secureScoreControlProfile'],
				operation: ['update'],
			},
		},
	},
	{
		displayName: 'Provider',
		name: 'provider',
		type: 'string',
		description: 'Name of the provider of the security product or service',
		default: '',
		placeholder: 'SecureScore',
		required: true,
		displayOptions: {
			show: {
				resource: ['secureScoreControlProfile'],
				operation: ['update'],
			},
		},
	},
	{
		displayName: 'Vendor',
		name: 'vendor',
		type: 'string',
		description: 'Name of the vendor of the security product or service',
		default: '',
		placeholder: 'Microsoft',
		required: true,
		displayOptions: {
			show: {
				resource: ['secureScoreControlProfile'],
				operation: ['update'],
			},
		},
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['secureScoreControlProfile'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'State',
				name: 'state',
				type: 'options',
				default: 'Default',
				description: 'Analyst driven setting on the control',
				options: [
					{
						name: 'Default',
						value: 'Default',
					},
					{
						name: 'Ignored',
						value: 'Ignored',
					},
					{
						name: 'Third Party',
						value: 'ThirdParty',
					},
				],
			},
		],
	},
];
