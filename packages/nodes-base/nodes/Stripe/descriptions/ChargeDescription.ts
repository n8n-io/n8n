import type { INodeProperties } from 'n8n-workflow';

export const chargeOperations: INodeProperties[] = [
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
				description: 'Create a charge',
				action: 'Create a charge',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a charge',
				action: 'Get a charge',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many charges',
				action: 'Get many charges',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a charge',
				action: 'Update a charge',
			},
		],
		displayOptions: {
			show: {
				resource: ['charge'],
			},
		},
	},
];

export const chargeFields: INodeProperties[] = [
	// ----------------------------------
	//       charge: create
	// ----------------------------------
	{
		displayName: 'Customer ID',
		name: 'customerId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the customer to be associated with this charge',
		displayOptions: {
			show: {
				resource: ['charge'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Amount',
		name: 'amount',
		type: 'number',
		required: true,
		default: 0,
		description:
			'Amount in cents to be collected for this charge, e.g. enter <code>100</code> for $1.00',
		typeOptions: {
			minValue: 0,
			maxValue: 99999999,
		},
		displayOptions: {
			show: {
				resource: ['charge'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Currency Name or ID',
		name: 'currency',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getCurrencies',
		},
		required: true,
		default: '',
		description:
			'Three-letter ISO currency code, e.g. <code>USD</code> or <code>EUR</code>. It must be a <a href="https://stripe.com/docs/currencies">Stripe-supported currency</a>. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: {
			show: {
				resource: ['charge'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Source ID',
		name: 'source',
		type: 'string',
		required: true,
		default: '',
		description: "ID of the customer's payment source to be charged",
		displayOptions: {
			show: {
				resource: ['charge'],
				operation: ['create'],
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
				resource: ['charge'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'Arbitrary text to describe the charge to create',
			},
			{
				displayName: 'Metadata',
				name: 'metadata',
				type: 'fixedCollection',
				default: [],
				placeholder: 'Add Metadata Item',
				description: 'Set of key-value pairs to attach to the charge to create',
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						displayName: 'Metadata Properties',
						name: 'metadataProperties',
						values: [
							{
								displayName: 'Key',
								name: 'key',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
							},
						],
					},
				],
			},
			{
				displayName: 'Receipt Email',
				name: 'receipt_email',
				type: 'string',
				default: '',
				description: 'Email address to which the receipt for this charge will be sent',
			},
			{
				displayName: 'Shipping',
				name: 'shipping',
				type: 'fixedCollection',
				description: 'Shipping information for the charge',
				placeholder: 'Add Field',
				typeOptions: {
					multipleValues: true,
				},
				default: [],
				options: [
					{
						displayName: 'Shipping Properties',
						name: 'shippingProperties',
						values: [
							{
								displayName: 'Recipient Name',
								name: 'name',
								type: 'string',
								description: 'Name of the person who will receive the shipment',
								default: '',
							},
							{
								displayName: 'Address',
								name: 'address',
								type: 'fixedCollection',
								default: {},
								placeholder: 'Add Field',
								options: [
									{
										displayName: 'Details',
										name: 'details',
										values: [
											{
												displayName: 'Line 1',
												name: 'line1',
												description: 'Address line 1 (e.g. street, PO Box, or company name)',
												type: 'string',
												default: '',
											},
											{
												displayName: 'Line 2',
												name: 'line2',
												description: 'Address line 2 (e.g. apartment, suite, unit, or building)',
												type: 'string',
												default: '',
											},
											{
												displayName: 'City',
												name: 'city',
												description: 'City, district, suburb, town, or village',
												type: 'string',
												default: '',
											},
											{
												displayName: 'State',
												name: 'state',
												description: 'State, county, province, or region',
												type: 'string',
												default: '',
											},
											{
												displayName: 'Country',
												name: 'country',
												description:
													'Two-letter country code (<a href="https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2">ISO 3166-1 alpha-2</a>)',
												type: 'string',
												default: '',
											},
											{
												displayName: 'Postal Code',
												name: 'postal_code',
												description: 'ZIP or postal code',
												type: 'string',
												default: '',
											},
										],
									},
								],
							},
						],
					},
				],
			},
		],
	},

	// ----------------------------------
	//       charge: get
	// ----------------------------------
	{
		displayName: 'Charge ID',
		name: 'chargeId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the charge to retrieve',
		displayOptions: {
			show: {
				resource: ['charge'],
				operation: ['get'],
			},
		},
	},

	// ----------------------------------
	//       charge: getAll
	// ----------------------------------
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: ['charge'],
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
				resource: ['charge'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
	},

	// ----------------------------------
	//          charge: update
	// ----------------------------------
	{
		displayName: 'Charge ID',
		name: 'chargeId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the charge to update',
		displayOptions: {
			show: {
				resource: ['charge'],
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
				resource: ['charge'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'Arbitrary text to describe the charge to update',
			},
			{
				displayName: 'Metadata',
				name: 'metadata',
				type: 'fixedCollection',
				default: {},
				placeholder: 'Add Metadata Item',
				description: 'Set of key-value pairs to attach to the charge to update',
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						displayName: 'Metadata Properties',
						name: 'metadataProperties',
						values: [
							{
								displayName: 'Key',
								name: 'key',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
							},
						],
					},
				],
			},
			{
				displayName: 'Receipt Email',
				name: 'receipt_email',
				type: 'string',
				default: '',
				description: 'The email address to which the receipt for this charge will be sent',
			},
			{
				displayName: 'Shipping',
				name: 'shipping',
				type: 'fixedCollection',
				default: {},
				description: 'Shipping information for the charge',
				placeholder: 'Add Field',
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						displayName: 'Shipping Properties',
						name: 'shippingProperties',
						default: {},
						values: [
							{
								displayName: 'Recipient Name',
								name: 'name',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Recipient Address',
								name: 'address',
								type: 'fixedCollection',
								default: {},
								placeholder: 'Add Address Details',
								options: [
									{
										displayName: 'Details',
										name: 'details',
										values: [
											{
												displayName: 'Line 1',
												name: 'line1',
												description: 'Address line 1 (e.g. street, PO Box, or company name)',
												type: 'string',
												default: '',
											},
											{
												displayName: 'Line 2',
												name: 'line2',
												description: 'Address line 2 (e.g. apartment, suite, unit, or building)',
												type: 'string',
												default: '',
											},
											{
												displayName: 'City',
												name: 'city',
												description: 'City, district, suburb, town, or village',
												type: 'string',
												default: '',
											},
											{
												displayName: 'State',
												name: 'state',
												description: 'State, county, province, or region',
												type: 'string',
												default: '',
											},
											{
												displayName: 'Country',
												name: 'country',
												description:
													'Two-letter country code (<a href="https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2">ISO 3166-1 alpha-2</a>)',
												type: 'string',
												default: '',
											},
											{
												displayName: 'Postal Code',
												name: 'postal_code',
												description: 'ZIP or postal code',
												type: 'string',
												default: '',
											},
										],
									},
								],
							},
						],
					},
				],
			},
		],
	},
];
