import {
	INodeProperties,
} from 'n8n-workflow';

export const transferOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		default: 'get',
		description: 'Operation to perform',
		options: [
			{
				name: 'Create',
				value: 'create',
			},
			{
				name: 'Delete',
				value: 'delete',
			},
			{
				name: 'Execute',
				value: 'execute',
			},
			{
				name: 'Get',
				value: 'get',
			},
			{
				name: 'Get All',
				value: 'getAll',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'transfer',
				],
			},
		},
	},
];

export const transferFields: INodeProperties[] = [
	// ----------------------------------
	//         transfer: create
	// ----------------------------------
	{
		displayName: 'Profile ID',
		name: 'profileId',
		type: 'options',
		required: true,
		default: [],
		typeOptions: {
			loadOptionsMethod: 'getProfiles',
			loadOptionsDependsOn: [
				'profileId',
			],
		},
		description: 'ID of the user profile to retrieve the balance of.',
		displayOptions: {
			show: {
				resource: [
					'transfer',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Quote ID',
		name: 'quoteId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the quote based on which to create the transfer.',
		displayOptions: {
			show: {
				resource: [
					'transfer',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Target Account ID',
		name: 'targetAccountId',
		type: 'options',
		required: true,
		default: [],
		typeOptions: {
			loadOptionsMethod: 'getRecipients',
		},
		description: 'ID of the account that will receive the funds.',
		displayOptions: {
			show: {
				resource: [
					'transfer',
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
					'transfer',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				displayName: 'Reference',
				name: 'reference',
				type: 'string',
				default: '',
				description: 'Reference text to show in the recipient\'s bank statement',
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
		description: 'ID of the transfer to delete.',
		displayOptions: {
			show: {
				resource: [
					'transfer',
				],
				operation: [
					'delete',
				],
			},
		},
	},

	// ----------------------------------
	//        transfer: execute
	// ----------------------------------
	{
		displayName: 'Profile ID',
		name: 'profileId',
		type: 'options',
		required: true,
		default: [],
		typeOptions: {
			loadOptionsMethod: 'getProfiles',
		},
		description: 'ID of the user profile to execute the transfer under.',
		displayOptions: {
			show: {
				resource: [
					'transfer',
				],
				operation: [
					'execute',
				],
			},
		},
	},
	{
		displayName: 'Transfer ID',
		name: 'transferId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the transfer to execute.',
		displayOptions: {
			show: {
				resource: [
					'transfer',
				],
				operation: [
					'execute',
				],
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
		description: 'ID of the transfer to retrieve.',
		displayOptions: {
			show: {
				resource: [
					'transfer',
				],
				operation: [
					'get',
				],
			},
		},
	},
	{
		displayName: 'Download Receipt',
		name: 'downloadReceipt',
		type: 'boolean',
		required: true,
		default: false,
		description: `Download the transfer receipt as a PDF file. Only for executed transfers, having status 'Outgoing Payment Sent'.`,
		displayOptions: {
			show: {
				resource: [
					'transfer',
				],
				operation: [
					'get',
				],
			},
		},
	},
	{
		displayName: 'Binary Property',
		name: 'binaryProperty',
		type: 'string',
		required: true,
		default: 'data',
		description: 'Name of the binary property to which to write to.',
		displayOptions: {
			show: {
				resource: [
					'transfer',
				],
				operation: [
					'get',
				],
				downloadReceipt: [
					true,
				],
			},
		},
	},
	{
		displayName: 'File Name',
		name: 'fileName',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'data.pdf',
		description: 'Name of the file that will be downloaded.',
		displayOptions: {
			show: {
				resource: [
					'transfer',
				],
				operation: [
					'get',
				],
				downloadReceipt: [
					true,
				],
			},
		},
	},

	// ----------------------------------
	//        transfer: getAll
	// ----------------------------------
	{
		displayName: 'Profile ID',
		name: 'profileId',
		type: 'options',
		required: true,
		default: [],
		typeOptions: {
			loadOptionsMethod: 'getProfiles',
		},
		description: 'ID of the user profile to retrieve.',
		displayOptions: {
			show: {
				resource: [
					'transfer',
				],
				operation: [
					'getAll',
				],
			},
		},
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Return all results.',
		displayOptions: {
			show: {
				resource: [
					'transfer',
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
		default: 5,
		description: 'The number of results to return.',
		typeOptions: {
			minValue: 1,
			maxValue: 1000,
		},
		displayOptions: {
			show: {
				resource: [
					'transfer',
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
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'transfer',
				],
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				displayName: 'Range',
				name: 'range',
				type: 'fixedCollection',
				placeholder: 'Add Range',
				description: 'Range of time for filtering the transfers.',
				default: {},
				options: [
					{
						displayName: 'Range Properties',
						name: 'rangeProperties',
						values: [
							{
								displayName: 'Created Date Start',
								name: 'createdDateStart',
								type: 'dateTime',
								default: '',
							},
							{
								displayName: 'Created Date End',
								name: 'createdDateEnd',
								type: 'dateTime',
								default: '',
							},
						],
					},
				],
			},
			{
				displayName: 'Source Currency',
				name: 'sourceCurrency',
				type: 'string',
				default: '',
				description: 'Code of the source currency for filtering the transfers.',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				default: 'processing',
				options: [
					{
						name: 'Bounced Back',
						value: 'bounced_back',
					},
					{
						name: 'Cancelled',
						value: 'cancelled',
					},
					{
						name: 'Charged Back',
						value: 'charged_back',
					},
					{
						name: 'Outgoing Payment Sent',
						value: 'outgoing_payment_sent',
					},
					{
						name: 'Funds Converted',
						value: 'funds_converted',
					},
					{
						name: 'Funds Refunded',
						value: 'funds_refunded',
					},
					{
						name: 'Incoming Payment Waiting',
						value: 'incoming_payment_waiting',
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
						name: 'Waiting for Recipient Input to Proceed',
						value: 'waiting_recipient_input_to_proceed',
					},
				],
			},
			{
				displayName: 'Target Currency',
				name: 'targetCurrency',
				type: 'string',
				default: '',
				description: 'Code of the target currency for filtering the transfers.',
			},
		],
	},
];
