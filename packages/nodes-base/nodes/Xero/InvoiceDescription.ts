import { INodeProperties } from 'n8n-workflow';

export const invoiceOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['invoice'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a invoice',
				action: 'Create an invoice',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a invoice',
				action: 'Get an invoice',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many invoices',
				action: 'Get many invoices',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a invoice',
				action: 'Update an invoice',
			},
		],
		default: 'create',
	},
];

export const invoiceFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                invoice:create                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Organization Name or ID',
		name: 'organizationId',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
		typeOptions: {
			loadOptionsMethod: 'getTenants',
		},
		default: '',
		displayOptions: {
			show: {
				resource: ['invoice'],
				operation: ['create'],
			},
		},
		required: true,
	},
	{
		displayName: 'Type',
		name: 'type',
		type: 'options',
		options: [
			{
				name: 'Bill',
				value: 'ACCPAY',
				description: 'Accounts Payable or supplier invoice',
			},
			{
				name: 'Sales Invoice',
				value: 'ACCREC',
				description: 'Accounts Receivable or customer invoice',
			},
		],
		default: '',
		displayOptions: {
			show: {
				resource: ['invoice'],
				operation: ['create'],
			},
		},
		required: true,
		description: 'Invoice Type',
	},
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['invoice'],
				operation: ['create'],
			},
		},
		required: true,
	},
	{
		displayName: 'Line Items',
		name: 'lineItemsUi',
		placeholder: 'Add Line Item',
		type: 'fixedCollection',
		default: {},
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				resource: ['invoice'],
				operation: ['create'],
			},
		},
		description: 'Line item data',
		options: [
			{
				name: 'lineItemsValues',
				displayName: 'Line Item',
				values: [
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
						description:
							'Lineitem unit amount. By default, unit amount will be rounded to two decimal places.',
					},
					{
						displayName: 'Item Code Name or ID',
						name: 'itemCode',
						type: 'options',
						description:
							'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
						typeOptions: {
							loadOptionsMethod: 'getItemCodes',
							loadOptionsDependsOn: ['organizationId'],
						},
						default: '',
					},
					{
						displayName: 'Account Code Name or ID',
						name: 'accountCode',
						type: 'options',
						description:
							'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
						typeOptions: {
							loadOptionsMethod: 'getAccountCodes',
							loadOptionsDependsOn: ['organizationId'],
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
								name: 'Sales Tax on Imports',
								value: 'GSTONIMPORTS',
							},
						],
						default: '',
						required: true,
					},
					{
						displayName: 'Tax Amount',
						name: 'taxAmount',
						type: 'string',
						default: '',
						description:
							'The tax amount is auto calculated as a percentage of the line amount based on the tax rate',
					},
					{
						displayName: 'Line Amount',
						name: 'lineAmount',
						type: 'string',
						default: '',
						description:
							'The line amount reflects the discounted price if a DiscountRate has been used',
					},
					{
						displayName: 'Discount Rate',
						name: 'discountRate',
						type: 'string',
						default: '',
						description:
							'Percentage discount or discount amount being applied to a line item. Only supported on ACCREC invoices - ACCPAY invoices and credit notes in Xero do not support discounts.',
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
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['invoice'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Branding Theme Name or ID',
				name: 'brandingThemeId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getBrandingThemes',
					loadOptionsDependsOn: ['organizationId'],
				},
				default: '',
			},
			{
				displayName: 'Currency Name or ID',
				name: 'currency',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getCurrencies',
					loadOptionsDependsOn: ['organizationId'],
				},
				default: '',
			},
			{
				displayName: 'Currency Rate',
				name: 'currencyRate',
				type: 'string',
				default: '',
				description:
					'The currency rate for a multicurrency invoice. If no rate is specified, the XE.com day rate is used.',
			},
			{
				displayName: 'Date',
				name: 'date',
				type: 'dateTime',
				default: '',
				description:
					'Date invoice was issued - YYYY-MM-DD. If the Date element is not specified it will default to the current date based on the timezone setting of the organisation.',
			},
			{
				displayName: 'Due Date',
				name: 'dueDate',
				type: 'dateTime',
				default: '',
				description: 'Date invoice is due - YYYY-MM-DD',
			},
			{
				displayName: 'Expected Payment Date',
				name: 'expectedPaymentDate',
				type: 'dateTime',
				default: '',
				description: 'Shown on sales invoices (Accounts Receivable) when this has been set',
			},
			{
				displayName: 'Invoice Number',
				name: 'invoiceNumber',
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
				displayName: 'Planned Payment Date',
				name: 'plannedPaymentDate',
				type: 'dateTime',
				default: '',
				description: 'Shown on bills (Accounts Payable) when this has been set',
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
				description:
					'Whether the invoice in the Xero app should be marked as "sent". This can be set only on invoices that have been approved.',
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
	/*                                invoice:update                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Organization Name or ID',
		name: 'organizationId',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
		typeOptions: {
			loadOptionsMethod: 'getTenants',
		},
		default: '',
		displayOptions: {
			show: {
				resource: ['invoice'],
				operation: ['update'],
			},
		},
		required: true,
	},
	{
		displayName: 'Invoice ID',
		name: 'invoiceId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['invoice'],
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
				resource: ['invoice'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Branding Theme Name or ID',
				name: 'brandingThemeId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getBrandingThemes',
					loadOptionsDependsOn: ['organizationId'],
				},
				default: '',
			},
			{
				displayName: 'Contact ID',
				name: 'contactId',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Currency Name or ID',
				name: 'currency',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getCurrencies',
					loadOptionsDependsOn: ['organizationId'],
				},
				default: '',
			},
			{
				displayName: 'Currency Rate',
				name: 'currencyRate',
				type: 'string',
				default: '',
				description:
					'The currency rate for a multicurrency invoice. If no rate is specified, the XE.com day rate is used.',
			},
			{
				displayName: 'Date',
				name: 'date',
				type: 'dateTime',
				default: '',
				description:
					'Date invoice was issued - YYYY-MM-DD. If the Date element is not specified it will default to the current date based on the timezone setting of the organisation.',
			},
			{
				displayName: 'Due Date',
				name: 'dueDate',
				type: 'dateTime',
				default: '',
				description: 'Date invoice is due - YYYY-MM-DD',
			},
			{
				displayName: 'Expected Payment Date',
				name: 'expectedPaymentDate',
				type: 'dateTime',
				default: '',
				description: 'Shown on sales invoices (Accounts Receivable) when this has been set',
			},
			{
				displayName: 'Invoice Number',
				name: 'invoiceNumber',
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
				default: {},
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
								description:
									'Lineitem unit amount. By default, unit amount will be rounded to two decimal places.',
							},
							{
								displayName: 'Item Code Name or ID',
								name: 'itemCode',
								type: 'options',
								description:
									'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
								typeOptions: {
									loadOptionsMethod: 'getItemCodes',
									loadOptionsDependsOn: ['organizationId'],
								},
								default: '',
							},
							{
								displayName: 'Account Code Name or ID',
								name: 'accountCode',
								type: 'options',
								description:
									'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
								typeOptions: {
									loadOptionsMethod: 'getAccountCodes',
									loadOptionsDependsOn: ['organizationId'],
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
										name: 'Sales Tax on Imports',
										value: 'GSTONIMPORTS',
									},
								],
								default: '',
								required: true,
							},
							{
								displayName: 'Tax Amount',
								name: 'taxAmount',
								type: 'string',
								default: '',
								description:
									'The tax amount is auto calculated as a percentage of the line amount based on the tax rate',
							},
							{
								displayName: 'Line Amount',
								name: 'lineAmount',
								type: 'string',
								default: '',
								description:
									'The line amount reflects the discounted price if a DiscountRate has been used',
							},
							{
								displayName: 'Discount Rate',
								name: 'discountRate',
								type: 'string',
								default: '',
								description:
									'Percentage discount or discount amount being applied to a line item. Only supported on ACCREC invoices - ACCPAY invoices and credit notes in Xero do not support discounts.',
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
				displayName: 'Planned Payment Date',
				name: 'plannedPaymentDate',
				type: 'dateTime',
				default: '',
				description: 'Shown on bills (Accounts Payable) when this has been set',
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
				description:
					'Whether the invoice in the Xero app should be marked as "sent". This can be set only on invoices that have been approved.',
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
	/*                                 invoice:get                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Organization Name or ID',
		name: 'organizationId',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
		typeOptions: {
			loadOptionsMethod: 'getTenants',
		},
		default: '',
		displayOptions: {
			show: {
				resource: ['invoice'],
				operation: ['get'],
			},
		},
		required: true,
	},
	{
		displayName: 'Invoice ID',
		name: 'invoiceId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['invoice'],
				operation: ['get'],
			},
		},
	},
	/* -------------------------------------------------------------------------- */
	/*                                   invoice:getAll                           */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Organization Name or ID',
		name: 'organizationId',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
		typeOptions: {
			loadOptionsMethod: 'getTenants',
		},
		default: '',
		displayOptions: {
			show: {
				resource: ['invoice'],
				operation: ['getAll'],
			},
		},
		required: true,
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['invoice'],
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
				resource: ['invoice'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 100,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['invoice'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Created By My App',
				name: 'createdByMyApp',
				type: 'boolean',
				default: false,
				description: "Whether you'll only retrieve Invoices created by your app",
			},
			{
				displayName: 'Order By',
				name: 'orderBy',
				type: 'string',
				placeholder: 'InvoiceID',
				default: '',
				description: 'Order by any element returned',
			},
			{
				displayName: 'Sort Order',
				name: 'sortOrder',
				type: 'options',
				options: [
					{
						name: 'Asc',
						value: 'ASC',
					},
					{
						name: 'Desc',
						value: 'DESC',
					},
				],
				default: '',
			},
			{
				displayName: 'Statuses',
				name: 'statuses',
				type: 'multiOptions',
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
				default: [],
			},
			{
				displayName: 'Where',
				name: 'where',
				type: 'string',
				placeholder: 'EmailAddress!=null&&EmailAddress.StartsWith("boom")',
				default: '',
				description:
					'The where parameter allows you to filter on endpoints and elements that don\'t have explicit parameters. <a href="https://developer.xero.com/documentation/api/requests-and-responses#get-modified">Examples Here</a>.',
			},
		],
	},
];
