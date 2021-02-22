import {
	INodeProperties,
} from 'n8n-workflow';

export const customerOperations = [
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
		displayOptions: {
			show: {
				resource: [
					'customer',
				],
			},
		},
	},
] as INodeProperties[];

export const customerFields = [
	// ----------------------------------
	//       customer: create
	// ----------------------------------
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		description: 'Full name or business name of the customer to create.',
		displayOptions: {
			show: {
				resource: [
					'customer',
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
					'customer',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				displayName: 'Address',
				name: 'address',
				type: 'fixedCollection',
				description: 'Address of the customer to create.',
				placeholder: 'Add Field',
				options: [
					{
						displayName: 'Details',
						name: 'details',
						values: [
							{
								displayName: 'City',
								name: 'city',
								description: 'City, district, suburb, town, or village.',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Country',
								name: 'country',
								description: 'Two-letter country code (<a href="https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2">ISO 3166-1 alpha-2</a>).',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Line 1',
								name: 'line1',
								description: 'Address line 1 (e.g., street, PO Box, or company name).',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Line 2',
								name: 'line2',
								description: 'Address line 2 (e.g., apartment, suite, unit, or building).',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Postal Code',
								name: 'postal_code',
								description: 'ZIP or postal code.',
								type: 'string',
								default: '',
							},
							{
								displayName: 'State',
								name: 'state',
								description: 'State, county, province, or region.',
								type: 'string',
								default: '',
							},
						],
					},
				],
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'Arbitrary string to describe the customer to create.',
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				default: '',
				description: 'Email of the customer to create.',
			},
			{
				displayName: 'Metadata',
				name: 'metadata',
				type: 'fixedCollection',
				placeholder: 'Add Metadata Item',
				description: 'Set of key-value pairs to attach to the customer to create.',
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
				displayName: 'Payment Method ID',
				name: 'paymentMethodId',
				type: 'string',
				default: '',
				description: 'ID of the payment method to associate with this customer.',
			},
			{
				displayName: 'Phone',
				name: 'phone',
				type: 'string',
				default: '',
				description: 'Telephone number of this customer.',
			},
			{
				displayName: 'Shipping',
				name: 'shipping',
				type: 'fixedCollection',
				description: 'Shipping information of the customer to create.',
				typeOptions: {
					multipleValues: true,
				},
				placeholder: 'Add Field',
				options: [
					{
						displayName: 'Shipping Properties',
						name: 'shippingProperties',
						values: [
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
												displayName: 'City',
												name: 'city',
												description: 'City, district, suburb, town, or village.',
												type: 'string',
												default: '',
											},
											{
												displayName: 'Country',
												name: 'country',
												description: 'Two-letter country code (<a href="https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2">ISO 3166-1 alpha-2</a>).',
												type: 'string',
												default: '',
											},
											{
												displayName: 'Line 1',
												name: 'line1',
												description: 'Address line 1 (e.g., street, PO Box, or company name).',
												type: 'string',
												default: '',
											},
											{
												displayName: 'Line 2',
												name: 'line2',
												description: 'Address line 2 (e.g., apartment, suite, unit, or building).',
												type: 'string',
												default: '',
											},
											{
												displayName: 'Postal Code',
												name: 'postal_code',
												description: 'ZIP or postal code.',
												type: 'string',
												default: '',
											},
											{
												displayName: 'State',
												name: 'state',
												description: 'State, county, province, or region.',
												type: 'string',
												default: '',
											},
										],
									},
								],
							},
							{
								displayName: 'Recipient Name',
								name: 'name',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Recipient Phone',
								name: 'phone',
								type: 'string',
								default: '',
							},
						],
					},
				],
			},
		],
	},

	// ----------------------------------
	//       customer: delete
	// ----------------------------------
	{
		displayName: 'Customer ID',
		name: 'customerId',
		type: 'options',
		required: true,
		default: [],
		typeOptions: {
			loadOptionsMethod: 'getCustomers',
		},
		description: 'ID of the customer to delete.',
		displayOptions: {
			show: {
				resource: [
					'customer',
				],
				operation: [
					'delete',
				],
			},
		},
	},

	// ----------------------------------
	//       customer: get
	// ----------------------------------
	{
		displayName: 'Customer ID',
		name: 'customerId',
		type: 'options',
		required: true,
		default: [],
		typeOptions: {
			loadOptionsMethod: 'getCustomers',
		},
		description: 'ID of the customer to retrieve.',
		displayOptions: {
			show: {
				resource: [
					'customer',
				],
				operation: [
					'get',
				],
			},
		},
	},

	// ----------------------------------
	//       customer: getAll
	// ----------------------------------
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'customer',
				],
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				default: '',
				description: 'Customer\'s email to filter by.',
			},
		],
	},

	// ----------------------------------
	//       customer: update
	// ----------------------------------
	{
		displayName: 'Customer ID',
		name: 'customerId',
		type: 'options',
		required: true,
		default: [],
		typeOptions: {
			loadOptionsMethod: 'getCustomers',
		},
		description: 'ID of the customer to update.',
		displayOptions: {
			show: {
				resource: [
					'customer',
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
					'customer',
				],
				operation: [
					'update',
				],
			},
		},
		options: [
			{
				displayName: 'Address',
				name: 'address',
				type: 'fixedCollection',
				description: 'Address of the customer to update.',
				placeholder: 'Add Field',
				options: [
					{
						displayName: 'Details',
						name: 'details',
						values: [
							{
								displayName: 'City',
								name: 'city',
								description: 'City, district, suburb, town, or village.',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Country',
								name: 'country',
								description: 'Two-letter country code (<a href="https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2">ISO 3166-1 alpha-2</a>).',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Line 1',
								name: 'line1',
								description: 'Address line 1 (e.g., street, PO Box, or company name).',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Line 2',
								name: 'line2',
								description: 'Address line 2 (e.g., apartment, suite, unit, or building).',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Postal Code',
								name: 'postal_code',
								description: 'ZIP or postal code.',
								type: 'string',
								default: '',
							},
							{
								displayName: 'State',
								name: 'state',
								description: 'State, county, province, or region.',
								type: 'string',
								default: '',
							},
						],
					},
				],
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'Arbitrary string to describe the customer to create.',
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				default: '',
				description: 'Email of the customer to create.',
			},
			{
				displayName: 'Metadata',
				name: 'metadata',
				type: 'fixedCollection',
				placeholder: 'Add Metadata Item',
				description: 'Set of key-value pairs to attach to the customer to create.',
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
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Full name or business name of the customer to create.',
			},
			{
				displayName: 'Payment Method ID',
				name: 'paymentMethodId',
				type: 'string',
				default: '',
				description: 'ID of the payment method to associate with this customer.',
			},
			{
				displayName: 'Phone',
				name: 'phone',
				type: 'string',
				default: '',
				description: 'Telephone number of this customer.',
			},
			{
				displayName: 'Shipping',
				name: 'shipping',
				type: 'fixedCollection',
				description: 'Shipping information of the customer to update.',
				typeOptions: {
					multipleValues: true,
				},
				placeholder: 'Add Field',
				options: [
					{
						displayName: 'Shipping Properties',
						name: 'shippingProperties',
						values: [
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
												displayName: 'City',
												name: 'city',
												description: 'City, district, suburb, town, or village.',
												type: 'string',
												default: '',
											},
											{
												displayName: 'Country',
												name: 'country',
												description: 'Two-letter country code (<a href="https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2">ISO 3166-1 alpha-2</a>).',
												type: 'string',
												default: '',
											},
											{
												displayName: 'Line 1',
												name: 'line1',
												description: 'Address line 1 (e.g., street, PO Box, or company name).',
												type: 'string',
												default: '',
											},
											{
												displayName: 'Line 2',
												name: 'line2',
												description: 'Address line 2 (e.g., apartment, suite, unit, or building).',
												type: 'string',
												default: '',
											},
											{
												displayName: 'Postal Code',
												name: 'postal_code',
												description: 'ZIP or postal code.',
												type: 'string',
												default: '',
											},
											{
												displayName: 'State',
												name: 'state',
												description: 'State, county, province, or region.',
												type: 'string',
												default: '',
											},
										],
									},
								],
							},
							{
								displayName: 'Recipient Name',
								name: 'name',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Recipient Phone',
								name: 'phone',
								type: 'string',
								default: '',
							},
						],
					},
				],
			},
		],
	},
] as INodeProperties[];
