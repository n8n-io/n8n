import { INodeProperties } from 'n8n-workflow';

export const affiliateOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['affiliate'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create an affiliate',
				action: 'Create an affiliate',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an affiliate',
				action: 'Delete an affiliate',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get an affiliate by ID',
				action: 'Get an affiliate',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get all affiliates',
				action: 'Get many affiliates',
			},
		],
		default: 'create',
	},
];

export const affiliateFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                 affiliate:create                           */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		placeholder: 'name@email.com',
		required: true,
		default: '',
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['affiliate'],
			},
		},
		description: 'The affiliate’s email',
	},
	{
		displayName: 'First Name',
		name: 'firstname',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['affiliate'],
			},
		},
		default: '',
		description: 'The affiliate’s firstname',
	},
	{
		displayName: 'Last Name',
		name: 'lastname',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['affiliate'],
			},
		},
		default: '',
		description: 'The affiliate’s lastname',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['affiliate'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Address',
				name: 'addressUi',
				placeholder: 'Address',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: false,
				},
				default: {},
				options: [
					{
						name: 'addressValues',
						displayName: 'Address',
						values: [
							{
								displayName: 'Line 1',
								name: 'address',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Line 2',
								name: 'address_two',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Postal Code',
								name: 'postal_code',
								type: 'string',
								default: '',
							},
							{
								displayName: 'City',
								name: 'city',
								type: 'string',
								default: '',
							},
							{
								displayName: 'State',
								name: 'state',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Country Code',
								name: 'country',
								type: 'string',
								default: '',
								description:
									'The country’s ISO_3166-1 code. <a href="https://en.wikipedia.org/wiki/ISO_3166-1">Codes</a>.',
							},
						],
					},
				],
			},
			{
				displayName: 'Company Name',
				name: 'companyName',
				type: 'string',
				default: '',
				description: 'The affiliate’s company data',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                 affiliate:delete                           */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Affiliate ID',
		name: 'affiliateId',
		required: true,
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['affiliate'],
				operation: ['delete'],
			},
		},
		description: 'The ID of the affiliate',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 affiliate:get                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Affiliate ID',
		name: 'affiliateId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['affiliate'],
				operation: ['get'],
			},
		},
		description: 'The ID of the affiliate',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 affiliate:getAll                           */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['affiliate'],
				operation: ['getAll'],
			},
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['affiliate'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 1000,
		},
		default: 100,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['affiliate'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Affiliate Group ID',
				name: 'affiliate_group_id',
				type: 'string',
				default: '',
				description: 'Retrieves affiliates for a certain affiliate group',
			},
			{
				displayName: 'Click ID',
				name: 'click_id',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
				description: 'An email address,',
			},
			{
				displayName: 'Parent ID',
				name: 'parentId',
				type: 'string',
				default: '',
				description: 'Retrieves children for a certain parent affiliate',
			},
			{
				displayName: 'Referral Code',
				name: 'referral_code',
				type: 'string',
				default: '',
				description:
					'An affiliate’s referral code. This corresponds to the value of ref= in their referral link.',
			},
			{
				displayName: 'Source ID',
				name: 'source_id',
				type: 'string',
				default: '',
			},
		],
	},
];
