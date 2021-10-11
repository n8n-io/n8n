import {
	INodeProperties,
} from 'n8n-workflow';

export const secureScoreControlProfileOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'secureScoreControlProfile',
				],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
			},
			{
				name: 'Get All',
				value: 'getAll',
			},
			{
				name: 'Update',
				value: 'update',
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
				resource: [
					'secureScoreControlProfile',
				],
				operation: [
					'get',
				],
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
				resource: [
					'secureScoreControlProfile',
				],
				operation: [
					'getAll',
				],
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
		},
		displayOptions: {
			show: {
				resource: [
					'secureScoreControlProfile',
				],
				operation: [
					'getAll',
				],
				returnAll: [
					false,
				],
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
				resource: [
					'secureScoreControlProfile',
				],
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				displayName: 'Filter Expression',
				name: '$filter',
				description: '<a href="https://docs.microsoft.com/en-us/graph/query-parameters#filter-parameter">Expression</a> to filter results by, e.g. <code>startswith(id,\'AATP\')</code>',
				type: 'string',
				default: '',
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
				resource: [
					'secureScoreControlProfile',
				],
				operation: [
					'update',
				],
			},
		},
	},
	{
		displayName: 'Provider',
		name: 'provider',
		type: 'string',
		description: 'Name of the security product/service vendor',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'secureScoreControlProfile',
				],
				operation: [
					'update',
				],
			},
		},
	},
	{
		displayName: 'Vendor',
		name: 'vendor',
		type: 'string',
		description: 'Name of the security product/service provider',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'secureScoreControlProfile',
				],
				operation: [
					'update',
				],
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
				resource: [
					'secureScoreControlProfile',
				],
				operation: [
					'update',
				],
			},
		},
		options: [
			{
				displayName: 'Assigned To',
				name: 'assignedTo',
				type: 'string', // TODO loadOptions
				default: '',
				description: 'Name of the analyst who the alert is assigned to for triage, investigation, or remediation',
			},
			{
				displayName: 'Comments',
				name: 'comments',
				type: 'multiOptions',
				default: [],
				description: 'Analyst comments on how the alert was closed, for customer alert management',
				options: [
					{
						name: 'Closed in Identity Protection (IPC)',
						value: 'Closed in IPC',
					},
					{
						name: 'Closed in Cloud App Security (MCAS)',
						value: 'Closed in MCAS',
					},
				],
			},
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
					{
						name: 'Reviewed',
						value: 'Reviewed',
					},
				],
			},
		],
	},
];
