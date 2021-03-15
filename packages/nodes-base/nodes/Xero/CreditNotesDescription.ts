import {
	INodeProperties,
 } from 'n8n-workflow';

export const creditNotesOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'credit_notes',
				],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get a invoice',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a invoice',
			},
		],
		default: 'update',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const creditNotesFields = [
	{
		displayName: 'Organization ID',
		name: 'organizationId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getTenants',
		},
		default: '',
		displayOptions: {
			show: {
				resource: [
					'credit_notes',
				],
				operation: [
					'get',
					'update',
				],
			},
		},
		required: true,
	},
/* -------------------------------------------------------------------------- */
/*                                credit notes:update                              */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Amount',
		name: 'amount',
		type: 'number',
		default: 0,
		displayOptions: {
			show: {
				resource: [
					'credit_notes',
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
					'credit_notes',
				],
				operation: [
					'update',
				],
			},
		},
		options: [
			{
				displayName: 'Branding Theme ID',
				name: 'brandingThemeId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getBrandingThemes',
					loadOptionsDependsOn: [
						'organizationId',
					],
				},
				default: '',
			},
			{
				displayName: 'Contact ID',
				name: 'contactId',
				type: 'string',
				default: '',
				description: 'Contact ID',
			},
			{
				displayName: 'Currency',
				name: 'currency',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getCurrencies',
					loadOptionsDependsOn: [
						'organizationId',
					],
				},
				default: '',
			},
			{
				displayName: 'Currency Rate',
				name: 'currencyRate',
				type: 'string',
				default: '',
				description: 'The currency rate for a multicurrency invoice. If no rate is specified, the XE.com day rate is used.',
			},
			{
				displayName: 'Date',
				name: 'date',
				type: 'dateTime',
				default: '',
				description: 'Date invoice was issued - YYYY-MM-DD. If the Date element is not specified it will default to the current date based on the timezone setting of the organisation',
			},
			{
				displayName: 'Invoice ID',
				name: 'InvoiceID',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Line Amount Type',
				name: 'lineAmountType',
				type: 'options',
				options: [
					{
						name: 'Exclusive',
						value: 'Exclusive',
						description: 'Line items are exclusive of tax',
					},
					{
						name: 'Inclusive',
						value: 'Inclusive',
						description: 'Line items are inclusive tax',
					},
					{
						name: 'NoTax',
						value: 'NoTax',
						description: 'Line have no tax',
					},
				],
				default: 'Exclusive',
			},
			{
				displayName: 'Line Items',
				name: 'lineItemsUi',
				placeholder: 'Add Line Item',
				type: 'fixedCollection',
				default: '',
				typeOptions: {
					multipleValues: true,
				},
				description: 'Line item data',
				options: [
					{
						name: 'lineItemsValues',
						displayName: 'Line Item',
						values: [
							{
								displayName: 'Line Item ID',
								name: 'lineItemId',
								type: 'string',
								default: '',
								description: 'The Xero generated identifier for a LineItem',
							},
							{
								displayName: 'Description',
								name: 'description',
								type: 'string',
								default: '',
								description: 'A line item with just a description',
							},
							{
								displayName: 'Quantity',
								name: 'quantity',
								type: 'number',
								default: 1,
								typeOptions: {
									minValue: 1,
								},
								description: 'LineItem Quantity',
							},
							{
								displayName: 'Unit Amount',
								name: 'unitAmount',
								type: 'string',
								default: '',
								description: 'Lineitem unit amount. By default, unit amount will be rounded to two decimal places.',
							},
							{
								displayName: 'Item Code',
								name: 'itemCode',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'getItemCodes',
									loadOptionsDependsOn: [
										'organizationId',
									],
								},
								default: '',
							},
							{
								displayName: 'Account Code',
								name: 'accountCode',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'getAccountCodes',
									loadOptionsDependsOn: [
										'organizationId',
									],
								},
								default: '',
							},
							{
								displayName: 'Tax Type',
								name: 'taxType',
								type: 'options',
								options: [
									{
										name: 'Tax on Purchases',
										value: 'INPUT',
									},
									{
										name: 'Tax Exempt',
										value: 'NONE',
									},
									{
										name: 'Tax on Sales',
										value: 'OUTPUT',
									},
									{
										name: 'Sales Tax on Imports	',
										value: 'GSTONIMPORTS',
									},
								],
								default: '',
								required: true,
								description: 'Tax Type',
							},
							{
								displayName: 'Tax Amount',
								name: 'taxAmount',
								type: 'string',
								default: '',
								description: 'The tax amount is auto calculated as a percentage of the line amount based on the tax rate.',
							},
							{
								displayName: 'Line Amount',
								name: 'lineAmount',
								type: 'string',
								default: '',
								description: 'The line amount reflects the discounted price if a DiscountRate has been used',
							},
							{
								displayName: 'Discount Rate',
								name: 'discountRate',
								type: 'string',
								default: '',
								description: 'Percentage discount or discount amount being applied to a line item. Only supported on ACCREC invoices - ACCPAY invoices and credit notes in Xero do not support discounts',
							},
							// {
							// 	displayName: 'Tracking',
							// 	name: 'trackingUi',
							// 	placeholder: 'Add Tracking',
							// 	description: 'Any LineItem can have a maximum of 2 TrackingCategory elements.',
							// 	type: 'fixedCollection',
							// 	typeOptions: {
							// 		multipleValues: true,
							// 	},
							// 	default: {},
							// 	options: [
							// 		{
							// 			name: 'trackingValues',
							// 			displayName: 'Tracking',
							// 			values: [
							// 				{
							// 					displayName: 'Name',
							// 					name: 'name',
							// 					type: 'options',
							// 					typeOptions: {
							// 						loadOptionsMethod: 'getTrakingCategories',
							// 						loadOptionsDependsOn: [
							// 							'organizationId',
							// 						],
							// 					},
							// 					default: '',
							// 					description: 'Name of the tracking category',
							// 				},
							// 				{
							// 					displayName: 'Option',
							// 					name: 'option',
							// 					type: 'options',
							// 					typeOptions: {
							// 						loadOptionsMethod: 'getTrakingOptions',
							// 						loadOptionsDependsOn: [
							// 							'/name',
							// 						],
							// 					},
							// 					default: '',
							// 					description: 'Name of the option',
							// 				},
							// 			],
							// 		},
							// 	],
							// },
						],
					},
				],
			},
			{
				displayName: 'Reference',
				name: 'reference',
				type: 'string',
				default: '',
				description: 'ACCREC only - additional reference number (max length = 255)',
			},
			{
				displayName: 'Send To Contact',
				name: 'sendToContact',
				type: 'boolean',
				default: false,
				description: 'Whether the invoice in the Xero app should be marked as "sent". This can be set only on invoices that have been approved',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{
						name: 'Draft',
						value: 'DRAFT',
					},
					{
						name: 'Submitted',
						value: 'SUBMITTED',
					},
					{
						name: 'Authorised',
						value: 'AUTHORISED',
					},
				],
				default: 'DRAFT',
			},
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				default: '',
				description: 'URL link to a source document - shown as "Go to [appName]" in the Xero app',
			},
		],
	},
/* -------------------------------------------------------------------------- */
/*                                 credit notes:get                                */
/* -------------------------------------------------------------------------- */
	{
			displayName: 'Custom Properties',
			name: 'customProperties',
			placeholder: 'Add Custom Property',
			description: 'Adds a custom property to the order. (Make sure to use Xero api docs as a guide)',
			type: 'fixedCollection',
			typeOptions: {
					multipleValues: true,
			},
			default: {},
			displayOptions: {
					show: {
							operation: [
									'get',
							],
							resource: [
									'credit_notes',
							],
					},
			},
			options: [
					{
							name: 'properties',
							displayName: 'Properties',
							values: [
									{
											displayName: 'Property Name',
											name: 'name',
											type: 'string',
											default: '',
											description: 'Name of the property to set.',
									},
									{
											displayName: 'Property Value',
											name: 'value',
											type: 'string',
											default: '',
											description: 'Value of the property to set.',
									},
							],
					},
			],
	},
] as INodeProperties[];
