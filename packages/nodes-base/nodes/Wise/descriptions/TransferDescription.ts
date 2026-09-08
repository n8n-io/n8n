import type { INodeProperties } from 'n8n-workflow';

export const transferOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'get',
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a transfer',
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a transfer',
			},
			{
				name: 'Execute',
				value: 'execute',
				action: 'Execute a transfer',
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a transfer',
			},
			{
				name: 'Get many',
				value: 'getAll',
				action: 'Get many transfers',
			},
		],
		displayOptions: {
			show: {
				resource: ['transfer'],
			},
		},
	},
];

export const transferFields: INodeProperties[] = [
	// ----------------------------------
	//         transfer: create
	// ----------------------------------
	{
		displayName: 'Profile name or ID',
		name: 'profileId',
		type: 'options',
		required: true,
		default: [],
		typeOptions: {
			loadOptionsMethod: 'getProfiles',
			loadOptionsDependsOn: ['profileId'],
		},
		description:
			'ID of the user profile to retrieve the balance of. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: {
			show: {
				resource: ['transfer'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Quote ID',
		name: 'quoteId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the quote based on which to create the transfer',
		displayOptions: {
			show: {
				resource: ['transfer'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Target account name or ID',
		name: 'targetAccountId',
		type: 'options',
		required: true,
		default: [],
		typeOptions: {
			loadOptionsMethod: 'getRecipients',
		},
		description:
			'ID of the account that will receive the funds. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: {
			show: {
				resource: ['transfer'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Additional fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: {
			show: {
				resource: ['transfer'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Reference',
				name: 'reference',
				type: 'string',
				default: '',
				description: "Reference text to show in the recipient's bank statement",
			},
		],
	},

	// ----------------------------------
	//         transfer: delete
	// ----------------------------------
	{
		displayName: 'Transfer ID',
		name: 'transferId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the transfer to delete',
		displayOptions: {
			show: {
				resource: ['transfer'],
				operation: ['delete'],
			},
		},
	},

	// ----------------------------------
	//        transfer: execute
	// ----------------------------------
	{
		displayName: 'Profile name or ID',
		name: 'profileId',
		type: 'options',
		required: true,
		default: [],
		typeOptions: {
			loadOptionsMethod: 'getProfiles',
		},
		description:
			'ID of the user profile to execute the transfer under. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: {
			show: {
				resource: ['transfer'],
				operation: ['execute'],
			},
		},
	},
	{
		displayName: 'Transfer ID',
		name: 'transferId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the transfer to execute',
		displayOptions: {
			show: {
				resource: ['transfer'],
				operation: ['execute'],
			},
		},
	},

	// ----------------------------------
	//         transfer: get
	// ----------------------------------
	{
		displayName: 'Transfer ID',
		name: 'transferId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the transfer to retrieve',
		displayOptions: {
			show: {
				resource: ['transfer'],
				operation: ['get'],
			},
		},
	},
	{
		displayName: 'Download receipt',
		name: 'downloadReceipt',
		type: 'boolean',
		required: true,
		default: false,
		description:
			"Whether to download the transfer receipt as a PDF file. Only for executed transfers, having status 'Outgoing payment sent'.",
		displayOptions: {
			show: {
				resource: ['transfer'],
				operation: ['get'],
			},
		},
	},
	{
		displayName: 'Put output file in field',
		name: 'binaryProperty',
		type: 'string',
		required: true,
		default: 'data',
		hint: 'The name of the output binary field to put the file in',
		displayOptions: {
			show: {
				resource: ['transfer'],
				operation: ['get'],
				downloadReceipt: [true],
			},
		},
	},
	{
		displayName: 'File name',
		name: 'fileName',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'data.pdf',
		description: 'Name of the file that will be downloaded',
		displayOptions: {
			show: {
				resource: ['transfer'],
				operation: ['get'],
				downloadReceipt: [true],
			},
		},
	},

	// ----------------------------------
	//        transfer: getAll
	// ----------------------------------
	{
		displayName: 'Profile name or ID',
		name: 'profileId',
		type: 'options',
		required: true,
		default: [],
		typeOptions: {
			loadOptionsMethod: 'getProfiles',
		},
		description:
			'ID of the user profile to retrieve. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: {
			show: {
				resource: ['transfer'],
				operation: ['getAll'],
			},
		},
	},
	{
		displayName: 'Return all',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: ['transfer'],
				operation: ['getAll'],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 5,
		description: 'Max number of results to return',
		typeOptions: {
			minValue: 1,
			maxValue: 1000,
		},
		displayOptions: {
			show: {
				resource: ['transfer'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add filter',
		default: {},
		displayOptions: {
			show: {
				resource: ['transfer'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Range',
				name: 'range',
				type: 'fixedCollection',
				placeholder: 'Add range',
				description: 'Range of time for filtering the transfers',
				default: {},
				options: [
					{
						displayName: 'Range properties',
						name: 'rangeProperties',
						values: [
							{
								displayName: 'Created date start',
								name: 'createdDateStart',
								type: 'dateTime',
								default: '',
							},
							{
								displayName: 'Created date end',
								name: 'createdDateEnd',
								type: 'dateTime',
								default: '',
							},
						],
					},
				],
			},
			{
				displayName: 'Source currency',
				name: 'sourceCurrency',
				type: 'string',
				default: '',
				description: 'Code of the source currency for filtering the transfers',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				default: 'processing',
				options: [
					{
						name: 'Bounced back',
						value: 'bounced_back',
					},
					{
						name: 'Cancelled',
						value: 'cancelled',
					},
					{
						name: 'Charged back',
						value: 'charged_back',
					},
					{
						name: 'Funds converted',
						value: 'funds_converted',
					},
					{
						name: 'Funds refunded',
						value: 'funds_refunded',
					},
					{
						name: 'Incoming payment waiting',
						value: 'incoming_payment_waiting',
					},
					{
						name: 'Outgoing payment sent',
						value: 'outgoing_payment_sent',
					},
					{
						name: 'Processing',
						value: 'processing',
					},
					{
						name: 'Unknown',
						value: 'unknown',
					},
					{
						name: 'Waiting for recipient input to proceed',
						value: 'waiting_recipient_input_to_proceed',
					},
				],
			},
			{
				displayName: 'Target currency',
				name: 'targetCurrency',
				type: 'string',
				default: '',
				description: 'Code of the target currency for filtering the transfers',
			},
		],
	},
];
