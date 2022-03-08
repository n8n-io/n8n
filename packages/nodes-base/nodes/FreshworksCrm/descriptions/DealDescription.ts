import {
	INodeProperties,
} from 'n8n-workflow';

export const dealOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'deal',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a deal',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a deal',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a deal',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Retrieve all deals',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a deal',
			},
		],
		default: 'create',
	},
];

export const dealFields: INodeProperties[] = [
	// ----------------------------------------
	//               deal: create
	// ----------------------------------------
	{
		displayName: 'Amount',
		name: 'amount',
		description: 'Value of the deal',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: {
				resource: [
					'deal',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Name',
		name: 'name',
		description: 'Name of the deal',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'deal',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'deal',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				displayName: 'Base Currency Amount',
				name: 'base_currency_amount',
				type: 'number',
				default: 0,
				description: 'Value of the deal in base currency',
			},
			{
				displayName: 'Campaign ID',
				name: 'campaign_id',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getCampaigns',
				},
				description: 'ID of the campaign that landed this deal',
			},
			{
				displayName: 'Currency ID',
				name: 'currency_id',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getCurrencies',
				},
				description: 'ID of the currency that the deal belongs to',
			},
			{
				displayName: 'Deal Payment Status ID',
				name: 'deal_payment_status_id',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getDealPaymentStatuses',
				},
				description: 'ID of the mode of payment for the deal',
			},
			{
				displayName: 'Deal Pipeline ID',
				name: 'deal_pipeline_id',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getDealPipelines',
				},
				description: 'ID of the deal pipeline that it belongs to',
			},
			{
				displayName: 'Deal Product ID',
				name: 'deal_product_id',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getDealProducts',
				},
				description: 'ID of the product that the deal belongs to (in a multi-product company)',
			},
			{
				displayName: 'Deal Reason ID',
				name: 'deal_reason_id',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getDealReasons',
				},
				description: 'ID of the reason for losing the deal. Can only be set if the deal is in \'Lost\' stage.',
			},
			{
				displayName: 'Deal Stage ID',
				name: 'deal_stage_id',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getDealStages',
				},
				description: 'ID of the deal stage that the deal belongs to',
			},
			{
				displayName: 'Deal Type ID',
				name: 'deal_type_id',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getDealTypes',
				},
				description: 'ID of the deal type that the deal belongs to',
			},
			{
				displayName: 'Lead Source ID',
				name: 'lead_source_id',
				type: 'string', // not obtainable from API
				default: '',
				description: 'ID of the source where deal came from',
			},
			{
				displayName: 'Owner ID',
				name: 'owner_id',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getUsers',
				},
				description: 'ID of the user to whom the deal is assigned',
			},
			{
				displayName: 'Probability',
				name: 'probability',
				type: 'number',
				default: 0,
				typeOptions: {
					minValue: 0,
					maxValue: 100,
				},
				description: 'Probability of winning the deal as a number between 0 and 100',
			},
			{
				displayName: 'Sales Account ID',
				name: 'sales_account_id',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getAccounts',
				},
				description: 'ID of the account that the deal belongs to',
			},
			{
				displayName: 'Territory ID',
				name: 'territory_id',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getTerritories',
				},
				description: 'ID of the territory that the deal belongs to',
			},
		],
	},

	// ----------------------------------------
	//               deal: delete
	// ----------------------------------------
	{
		displayName: 'Deal ID',
		name: 'dealId',
		description: 'ID of the deal to delete',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'deal',
				],
				operation: [
					'delete',
				],
			},
		},
	},

	// ----------------------------------------
	//                deal: get
	// ----------------------------------------
	{
		displayName: 'Deal ID',
		name: 'dealId',
		description: 'ID of the deal to retrieve',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'deal',
				],
				operation: [
					'get',
				],
			},
		},
	},

	// ----------------------------------------
	//               deal: getAll
	// ----------------------------------------
	{
		displayName: 'View',
		name: 'view',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'deal',
				],
				operation: [
					'getAll',
				],
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getDealViews',
		},
		default: '',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: [
					'deal',
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
		description: 'How many results to return',
		typeOptions: {
			minValue: 1,
		},
		displayOptions: {
			show: {
				resource: [
					'deal',
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

	// ----------------------------------------
	//               deal: update
	// ----------------------------------------
	{
		displayName: 'Deal ID',
		name: 'dealId',
		description: 'ID of the deal to update',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'deal',
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
					'deal',
				],
				operation: [
					'update',
				],
			},
		},
		options: [
			{
				displayName: 'Amount',
				name: 'amount',
				type: 'number',
				default: 0,
				typeOptions: {
					minValue: 0,
				},
				description: 'Value of the deal',
			},
			{
				displayName: 'Base Currency Amount',
				name: 'base_currency_amount',
				type: 'number',
				default: 0,
				typeOptions: {
					minValue: 0,
				},
				description: 'Value of the deal in base currency',
			},
			{
				displayName: 'Campaign ID',
				name: 'campaign_id',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getCampaigns',
				},
				description: 'ID of the campaign that landed this deal',
			},
			{
				displayName: 'Currency ID',
				name: 'currency_id',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getCurrencies',
				},
				description: 'ID of the currency that the deal belongs to',
			},
			{
				displayName: 'Deal Payment Status ID',
				name: 'deal_payment_status_id',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getDealPaymentStatuses',
				},
				description: 'ID of the mode of payment for the deal',
			},
			{
				displayName: 'Deal Pipeline ID',
				name: 'deal_pipeline_id',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getDealPipelines',
				},
				description: 'ID of the deal pipeline that it belongs to',
			},
			{
				displayName: 'Deal Product ID',
				name: 'deal_product_id',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getDealProducts',
				},
				description: 'ID of the product that the deal belongs to (in a multi-product company)',
			},
			{
				displayName: 'Deal Reason ID',
				name: 'deal_reason_id',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getDealReasons',
				},
				description: 'ID of the reason for losing the deal. Can only be set if the deal is in \'Lost\' stage.',
			},
			{
				displayName: 'Deal Stage ID',
				name: 'deal_stage_id',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getDealStages',
				},
				description: 'ID of the deal stage that the deal belongs to',
			},
			{
				displayName: 'Deal Type ID',
				name: 'deal_type_id',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getDealTypes',
				},
				description: 'ID of the deal type that the deal belongs to',
			},
			{
				displayName: 'Lead Source ID',
				name: 'lead_source_id',
				type: 'string', // not obtainable from API
				default: '',
				description: 'ID of the source where deal came from',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Name of the deal',
			},
			{
				displayName: 'Owner ID',
				name: 'owner_id',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getUsers',
				},
				description: 'ID of the user to whom the deal is assigned',
			},
			{
				displayName: 'Probability',
				name: 'probability',
				type: 'number',
				default: 0,
				typeOptions: {
					minValue: 0,
					maxValue: 100,
				},
				description: 'Probability of winning the deal as a number between 0 and 100',
			},
			{
				displayName: 'Sales Account ID',
				name: 'sales_account_id',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getAccounts',
				},
				description: 'ID of the account that the deal belongs to',
			},
			{
				displayName: 'Territory ID',
				name: 'territory_id',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getTerritories',
				},
				description: 'ID of the territory that the deal belongs to',
			},
		],
	},
];
