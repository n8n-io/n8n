import {
	INodeProperties,
} from 'n8n-workflow';

export const invoiceOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: false,
		displayOptions: {
			show: {
				resource: [
					'invoice',
				],
			},
		},
		options: [
			{
				name: 'Book',
				value: 'bookInvoice',
				description: 'This endpoint can be used to book invoices.<br> Invoices are booked on payment accounts where (bank) transactions are located and might be linked to the transactions by using this endpoint.<br> For more detailed information about booking invoices, please refer to <a href="https://5677.extern.sevdesk.dev/apiOverview/index.html#/doc-invoices#booking">this</a> section of our API-Overview',
			},
			{
				name: 'Cancel',
				value: 'cancel',
				description: 'This endpoint will cancel the specified invoice therefor creating a cancellation invoice.<br> The cancellation invoice will be automatically paid and the source invoices status will change to "cancelled"',
			},
			{
				name: 'Create By Factory',
				value: 'createByFactory',
				description: 'This endpoint offers you the following functionality. <ul> <li>Create invoices together with positions and discounts</li> <li>Delete positions while adding new ones</li> <li>Delete or add discounts, or both at the same time</li> <li>Automatically fill the address of the supplied contact into the invoice address</li> </ul> To make your own request sample slimmer, you can omit all parameters which are not required and nullable. However, for a valid and logical bookkeeping document, you will also need some of them to ensure that all the necessary data is in the invoice.',
			},
			{
				name: 'Delete',
				value: 'delete',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Returns a single invoice',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'There are a multitude of parameter which can be used to filter. A few of them are attached but for a complete list please check out <a href="https://5677.extern.sevdesk.dev/apiOverview/index.html#/doc-invoices#filtering">this</a> list.',
			},
			{
				name: 'Get Is Invoice Partially Paid',
				value: 'getIsInvoicePartiallyPaid',
				description: 'Returns "true" if the given invoice is partially paid - "false" if it is not. Invoices which are completely paid are regarded as not partially paid.',
			},
			{
				name: 'Invoice Get Pdf',
				value: 'invoiceGetPdf',
				description: 'Retrieves the pdf document of an invoice with additional metadata',
			},
			{
				name: 'Invoice Render',
				value: 'invoiceRender',
				description: 'Using this endpoint you can render the pdf document of an invoice.<br> Use cases for this are the retrieval of the pdf location or the forceful re-render of a already sent invoice.<br> Please be aware that changing an invoice after it has been sent to a customer is not an allowed bookkeeping process',
			},
			{
				name: 'Invoice Send By',
				value: 'invoiceSendBy',
				description: 'Marks an invoice as sent by a chosen send type',
			},
			{
				name: 'Mark As Sent',
				value: 'markAsSent',
				description: 'Marks an invoice as sent. This endpoint should not be used any more as it bypasses the normal sending flow.',
			},
			{
				name: 'Send Via E Mail',
				value: 'sendViaEMail',
				description: 'This endpoint sends the specified invoice to a customer via email.<br> This will automatically mark the invoice as sent.<br> Please note, that in production an invoice is not allowed to be changed after this happened!',
			},
		],
		default: 'get',
		// nodelinter-ignore-next-line WEAK_PARAM_DESCRIPTION
		description: 'The operation to perform',
	},
];

export const invoiceFields: INodeProperties[] = [
	// ----------------------------------------
	//              invoice: book
	// ----------------------------------------
	{
		displayName: 'Invoice ID',
		name: 'invoiceId',
		description: 'ID of invoice to book',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: {
				resource: [
					'invoice',
				],
				operation: [
					'bookInvoice',
				],
			},
		},
	},
	{
		displayName: 'Amount',
		name: 'amount',
		description: 'Amount which should be booked. Can also be a partial amount.',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: {
				resource: [
					'invoice',
				],
				operation: [
					'bookInvoice',
				],
			},
		},
	},
	{
		displayName: 'Date',
		name: 'date',
		description: 'The booking date. Most likely the current date.',
		type: 'dateTime',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'invoice',
				],
				operation: [
					'bookInvoice',
				],
			},
		},
	},
	{
		displayName: 'Type',
		name: 'type',
		description: 'Define a type for the booking.<br>\r\n The following type abbreviations are available (abbreviation <-> meaning).<br>\r\n <ul>\r\n <li>N <-> Normal booking / partial booking</li>\r\n <li>CB <-> Reduced amount due to discount (skonto)</li>\r\n <li>CF <-> Reduced/Higher amount due to currency fluctuations</li>\r\n <li>O <-> Reduced/Higher amount due to other reasons</li>\r\n <li>OF <-> Higher amount due to reminder charges</li>\r\n <li>MTC <-> Reduced amount due to the monetary traffic costs</li>\r\n </ul>',
		type: 'string',
		required: true,
		default: 'N',
		displayOptions: {
			show: {
				resource: [
					'invoice',
				],
				operation: [
					'bookInvoice',
				],
			},
		},
	},
	{
		displayName: 'Check Account',
		name: 'checkAccount',
		description: 'The check account on which should be booked',
		type: 'collection',
		default: {},
		required: true,
		options: [
			{
				displayName: 'ID',
				name: 'id',
				type: 'number',
				default: 0,
				description: 'The ID of the check account on which should be booked',
			},
			{
				displayName: 'Object Name',
				name: 'objectName',
				type: 'string',
				default: 'CheckAccount',
				description: 'Internal object name which is "CheckAccount"',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'invoice',
				],
				operation: [
					'bookInvoice',
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
					'invoice',
				],
				operation: [
					'bookInvoice',
				],
			},
		},
		options: [
			{
				displayName: 'Check account transaction',
				name: 'checkAccountTransaction',
				type: 'collection',
				default: 0,
				description: 'The check account transaction on which should be booked. The transaction will be linked to the invoice.',
				options: [
					{
						displayName: 'ID',
						name: 'id',
						type: 'number',
						default: 0,
						description: 'The ID of the check account transaction on which should be booked',
					},
					{
						displayName: 'Object Name',
						name: 'objectName',
						type: 'string',
						default: 'CheckAccountTransaction',
						description: 'Internal object name which is "CheckAccountTransaction"',
					},
				],
			},
			{
				displayName: 'Create Feed',
				name: 'createFeed',
				type: 'boolean',
				default: false,
				description: 'Determines if a feed is created for the booking process.',
			},
		],
	},

	// ----------------------------------------
	//             invoice: cancel
	// ----------------------------------------
	{
		displayName: 'Invoice ID',
		name: 'invoiceId',
		description: 'ID of invoice to be cancelled',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: {
				resource: [
					'invoice',
				],
				operation: [
					'cancel',
				],
			},
		},
	},

	// ----------------------------------------
	//             invoice: create by factory
	// ----------------------------------------
	// {
	// 	displayName: 'Object Name',
	// 	name: 'objectName',
	// 	description: 'The invoice object name',
	// 	type: 'string',
	// 	required: true,
	// 	default: 'Invoice',
	// 	displayOptions: {
	// 		show: {
	// 			resource: [
	// 				'invoice',
	// 			],
	// 			operation: [
	// 				'createByFactory',
	// 			],
	// 		},
	// 	},
	// },
	{
		displayName: 'Contact',
		name: 'contact',
		type: 'collection',
		default: 0,
		description: 'The contact used in the invoice',
		displayOptions: {
			show: {
				resource: [
					'invoice',
				],
				operation: [
					'createByFactory',
				],
			},
		},
		options: [
			{
				displayName: 'ID',
				name: 'id',
				type: 'number',
				default: 0,
				description: 'Unique identifier of the contact',
			},
			{
				displayName: 'Object Name',
				name: 'objectName',
				type: 'string',
				default: 'Contact',
				description: 'Model name, which is "Contact"',
			},
		],
	},
	{
		displayName: 'Invoice Date',
		name: 'invoiceDate',
		type: 'dateTime' || 'string',
		default: '',
		description: 'Needs to be provided as timestamp or dd.mm.yyyy',
		displayOptions: {
			show: {
				resource: [
					'invoice',
				],
				operation: [
					'createByFactory',
				],
			},
		},
	},
	{
		displayName: 'Discount',
		name: 'discount',
		type: 'number',
		default: 0,
		description: 'If you want to give a discount, define the percentage here. Otherwise provide zero as value',
		displayOptions: {
			show: {
				resource: [
					'invoice',
				],
				operation: [
					'createByFactory',
				],
			},
		},
	},
	{
		displayName: 'Delivery Date',
		name: 'deliveryDate',
		type: 'dateTime' || 'string',
		default: '',
		description: 'Timestamp. This can also be a date range if you also use the attribute deliveryDateUntil',
		displayOptions: {
			show: {
				resource: [
					'invoice',
				],
				operation: [
					'createByFactory',
				],
			},
		},
	},
	{
		displayName: 'Status',
		name: 'status',
		type: 'options',
		description: 'Please have a look in our <a href="https://5677.extern.sevdesk.dev/apiOverview/index.html#/doc-invoices#types">API-Overview</a> to see what the different status codes mean',
		displayOptions: {
			show: {
				resource: [
					'invoice',
				],
				operation: [
					'createByFactory',
				],
			},
		},
		options: [
			{
				name: '50',
				value: '50',
			},
			{
				name: '100',
				value: '100',
			},
			{
				name: '200',
				value: '200',
			},
			{
				name: '1000',
				value: '1000',
			},
		],
		default: '100',
	},
	{
		displayName: 'Small Settlement',
		name: 'smallSettlement',
		type: 'boolean',
		default: false,
		description: 'Defines if the client uses the small settlement scheme. If yes, the invoice must not contain any vat.',
		displayOptions: {
			show: {
				resource: [
					'invoice',
				],
				operation: [
					'createByFactory',
				],
			},
		},
	},
	{
		displayName: 'Contact Person',
		name: 'contactPerson',
		description: 'The user who acts as a contact person for the invoice',
		type: 'collection',
		required: true,
		default: 'Invoice',
		displayOptions: {
			show: {
				resource: [
					'invoice',
				],
				operation: [
					'createByFactory',
				],
			},
		},
		options: [
			{
				displayName: 'ID',
				name: 'id',
				type: 'number',
				default: 0,
				description: 'Unique identifier of the use',
			},
			{
				displayName: 'Object Name',
				name: 'objectName',
				type: 'string',
				default: 'SevUser',
				description: 'Model name, which is "SevUser"',
			},
		],
	},
	{
		displayName: 'Tax Rate',
		name: 'taxRate',
		type: 'number',
		default: 0,
		description: 'Is overwritten by invoice position tax rates',
		displayOptions: {
			show: {
				resource: [
					'invoice',
				],
				operation: [
					'createByFactory',
				],
			},
		},
	},
	{
		displayName: 'Tax Text',
		name: 'taxText',
		type: 'string',
		default: 0,
		description: 'A common tax text would be "Umsatzsteuer 19%"',
		displayOptions: {
			show: {
				resource: [
					'invoice',
				],
				operation: [
					'createByFactory',
				],
			},
		},
	},
	{
		displayName: 'Tax Type',
		name: 'taxType',
		type: 'string',
		default: 'default',
		description: 'Tax type of the invoice. There are four tax types: <ol> <li>default - Umsatzsteuer ausweisen</li> <li>eu - Steuerfreie innergemeinschaftliche Lieferung (Europäische Union)</li> <li>noteu - Steuerschuldnerschaft des Leistungsempfängers (außerhalb EU, z. B. Schweiz)</li> <li>custom - Using custom tax set Tax rates are heavily connected to the tax type used.</li> </ol>',
		displayOptions: {
			show: {
				resource: [
					'invoice',
				],
				operation: [
					'createByFactory',
				],
			},
		},
	},
	{
		displayName: 'Invoice Type',
		name: 'invoiceType',
		type: 'string',
		default: 'RE',
		description: 'Type of the invoice. For more information on the different types, check <a href="https://5677.extern.sevdesk.dev/apiOverview/index.html#/doc-invoices#types">this</a> section of our API-Overview',
		displayOptions: {
			show: {
				resource: [
					'invoice',
				],
				operation: [
					'createByFactory',
				],
			},
		},
	},
	{
		displayName: 'Currency',
		name: 'currency',
		type: 'string',
		default: 'EUR',
		description: 'Currency used in the invoice. Needs to be currency code according to ISO-4217',
		displayOptions: {
			show: {
				resource: [
					'invoice',
				],
				operation: [
					'createByFactory',
				],
			},
		},
	},
	{
		displayName: 'Map All',
		name: 'mapAll',
		type: 'boolean',
		default: true,
		displayOptions: {
			show: {
				resource: [
					'invoice',
				],
				operation: [
					'createByFactory',
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
					'invoice',
				],
				operation: [
					'createByFactory',
				],
			},
		},
		options: [
			{
				displayName: 'Invoice Number',
				name: 'invoiceNumber',
				type: 'string',
				default: '',
				description: 'The invoice number. Example: RE-1000',
			},
			{
				displayName: 'Invoice Number',
				name: 'invoiceNumber',
				type: 'string',
				default: '',
				description: 'The invoice number. Example: RE-1000',
			},
			{
				displayName: 'Create Date',
				name: 'create',
				type: 'dateTime',
				default: '',
				description: 'Date of invoice creation',
			},
			{
				displayName: 'Update Date',
				name: 'update',
				type: 'dateTime',
				default: '',
				description: 'Date of last invoice update',
			},
			{
				displayName: 'Header',
				name: 'header',
				type: 'string',
				default: '',
				description: 'Normally consist of prefix plus the invoice number',
			},
			{
				displayName: 'Head Text',
				name: 'headText',
				type: 'string',
				default: '',
				description: 'Certain html tags can be used here to format your text',
			},
			{
				displayName: 'Foot Text',
				name: 'footText',
				type: 'string',
				default: '',
				description: 'Certain html tags can be used here to format your text',
			},
			{
				displayName: 'Time to pay',
				name: 'timeToPay',
				type: 'number',
				default: '',
				description: 'The time the customer has to pay the invoice in days',
			},
			{
				displayName: 'Discount Time',
				name: 'discountTime',
				type: 'number',
				default: 0,
				description: 'If a value other than zero is used for the discount attribute, you need to specify the amount of days for which the discount is granted.',
			},
			{
				displayName: 'Pay Date',
				name: 'payDate',
				type: 'dateTime' || 'string',
				default: '',
				description: 'Needs to be timestamp or dd.mm.yyyy',
			},
			{
				displayName: 'Dunning Level',
				name: 'dunningLevel',
				type: 'number',
				default: 1,
				description: 'Defines how many reminders have already been sent for the invoice. Starts with 1 (Payment reminder) and should be incremented by one every time another reminder is sent.',
			},
			{
				displayName: 'Payment Method',
				name: 'paymentMethod',
				type: 'collection',
				default: {},
				description: 'Payment method used for the invoice',
				options: [
					{
						displayName: 'ID',
						name: 'id',
						type: 'number',
						default: 0,
						description: 'Unique identifier of the payment method',
					},
					{
						displayName: 'Object Name',
						name: 'objectName',
						type: 'string',
						default: 'PaymentMethod',
						description: 'Model name, which is "PaymentMethod"',
					},
				],
			},
			{
				displayName: 'Cost Centre',
				name: 'costCentre',
				type: 'collection',
				default: {},
				description: 'Cost Centre for the invoice',
				options: [
					{
						displayName: 'ID',
						name: 'id',
						type: 'number',
						default: 0,
						description: 'Unique identifier of the Cost Centre',
					},
					{
						displayName: 'Object Name',
						name: 'objectName',
						type: 'string',
						default: 'CostCentre',
						description: 'Model name, which is "CostCentre"',
					},
				],
			},
			{
				displayName: 'Send Date',
				name: 'sendDate',
				type: 'dateTime',
				default: '',
				description: 'The date the invoice was sent to the customer',
			},
			{
				displayName: 'Origin',
				name: 'origin',
				type: 'collection',
				default: {},
				description: 'Origin of the invoice. Could f.e. be an order',
				options: [
					{
						displayName: 'ID',
						name: 'id',
						type: 'number',
						default: 0,
						description: 'Unique identifier of the object',
					},
					{
						displayName: 'Object Name',
						name: 'objectName',
						type: 'string',
						default: '',
						description: 'Model name. Could f.e. be "Order"',
					},
				],
			},
			{
				displayName: 'Account Intervall',
				name: 'accountIntervall',
				type: 'string',
				default: '',
				description: 'The interval in which recurring invoices are due as ISO-8601 duration. Necessary attribute for all recurring invoices.',
			},
			{
				displayName: 'Account Next Invoice',
				name: 'accountNextInvoice',
				type: 'dateTime',
				default: '',
				description: 'Timestamp when the next invoice will be generated by this recurring invoice',
			},
			{
				displayName: 'Reminder Total',
				name: 'reminderTotal',
				type: 'number',
				default: '',
				description: 'Total reminder amount',
			},
			{
				displayName: 'Reminder Debit',
				name: 'reminderDebit',
				type: 'number',
				default: '',
				description: 'Debit of the reminder',
			},
			{
				displayName: 'Reminder Deadline',
				name: 'reminderDeadline',
				type: 'dateTime',
				default: '',
				description: 'Deadline of the reminder as timestamp',
			},
			{
				displayName: 'Reminder Charge',
				name: 'reminderCharge',
				type: 'dateTime',
				default: '',
				description: 'The additional reminder charge',
			},
			{
				displayName: 'Tax Set',
				name: 'taxSet',
				type: 'collection',
				default: {},
				description: 'Origin of the invoice. Could f.e. be an order',
				options: [
					{
						displayName: 'ID',
						name: 'id',
						type: 'number',
						default: 0,
						description: 'Unique identifier of the object',
					},
					{
						displayName: 'Object Name',
						name: 'objectName',
						type: 'string',
						default: 'TaxSet',
						description: 'Model name, which is "TaxSet"',
					},
				],
			},
			{
				displayName: 'Address',
				name: 'address',
				type: 'string',
				default: '',
				description: 'Complete address of the recipient including name, street, city, zip and country. * Line breaks can be used and will be displayed on the invoice pdf.',
			},
			{
				displayName: 'Customer Internal Note',
				name: 'customerInternalNote',
				type: 'string',
				default: '',
				description: 'Internal note of the customer. Contains data entered into field "Referenz/Bestellnummer".',
			},
			{
				displayName: 'Show Net',
				name: 'showNet',
				type: 'boolean',
				default: true,
				description: 'If true, the net amount of each position will be shown on the invoice. Otherwise gross amount.',
			},
			{
				displayName: 'Enshrined',
				name: 'enshrined',
				type: 'dateTime',
				default: '',
				description: 'Defines if and when invoice was enshrined. Enshrined invoices can not be manipulated.',
			},
			{
				displayName: 'Send Type',
				name: 'sendType',
				type: 'string',
				default: '',
				description: 'Type which was used to send the invoice. IMPORTANT: Please refer to the invoice section of the * API-Overview to understand how this attribute can be used before using it!',
			},
			{
				displayName: 'Delivery Date Until',
				name: 'deliveryDateUntil',
				type: 'number',
				default: '',
				description: 'If the delivery date should be a time range, another timestamp can be provided in this attribute * to define a range from timestamp used in deliveryDate attribute to the timestamp used here.',
			},
		],
	},
	{
		displayName: 'Invoice Positions',
		name: 'invoicePositions',
		type: 'collection',
		placeholder: 'Add Field',
		default: [],
		displayOptions: {
			show: {
				resource: [
					'invoice',
				],
				operation: [
					'createByFactory',
				],
			},
		},
		options: [
			{
				displayName: 'Save Invoice Positions',
				name: 'invoicePosSave',
				type: 'json',
				default: 'null',
				description: 'The invoice positions you want to create. If you don\'t have any, set to null. You can find the Model <a href="https://my.sevdesk.de/swaggerUI/index.html#/Models">here</a>',
			},
			{
				displayName: 'Delete Invoice Positions',
				name: 'invoicePosDelete',
				type: 'json',
				default: 'null',
				description: 'The invoice positions you want to delete. If you don\'t have any, set to null. You can find the Model <a href="https://my.sevdesk.de/swaggerUI/index.html#/Models">here</a>',
			},
		],
	},
	{
		displayName: 'Discounts',
		name: 'discounts',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'invoice',
				],
				operation: [
					'createByFactory',
				],
			},
		},
		options: [
			{
				displayName: 'Save Discounts',
				name: 'discountSave',
				type: 'json',
				default: 'null',
				description: 'The discounts you want to create. If you don\'t have any, set to null. You can find the Model <a href="https://my.sevdesk.de/swaggerUI/index.html#/Models">here</a>',
			},
			{
				displayName: 'Delete Discounts',
				name: 'discountDelete',
				type: 'json',
				default: 'null',
				description: 'The discounts you want to create. If you don\'t have any, set to null. You can find the Model <a href="https://my.sevdesk.de/swaggerUI/index.html#/Models">here</a>',
			},
		],
	},

	// ----------------------------------------
	//             invoice: delete
	// ----------------------------------------
	{
		displayName: 'Invoice ID',
		name: 'invoiceId',
		description: 'Id of invoice resource to delete',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: {
				resource: [
					'invoice',
				],
				operation: [
					'delete',
				],
			},
		},
	},

	// ----------------------------------------
	//             invoice: invoiceRender
	// ----------------------------------------
	{
		displayName: 'Invoice ID',
		name: 'invoiceId',
		description: 'Id of invoice resource to delete',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: {
				resource: [
					'invoice',
				],
				operation: [
					'invoiceRender',
				],
			},
		},
	},
	{
		displayName: 'Force Reload',
		name: 'forceReload',
		description: 'Define if a forceful re-render should occur.',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: [
					'invoice',
				],
				operation: [
					'invoiceRender',
				],
			},
		},
	},

	// ----------------------------------------
	//               invoice: get
	// ----------------------------------------
	{
		displayName: 'Invoice ID',
		name: 'invoiceId',
		description: 'ID of invoice to return',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: {
				resource: [
					'invoice',
				],
				operation: [
					'get',
				],
			},
		},
	},

	// ----------------------------------------
	//             invoice: getAll
	// ----------------------------------------
	{
		displayName: 'Status',
		name: 'status',
		description: 'Status of the invoices',
		type: 'number',
		default: 0,
		displayOptions: {
			show: {
				resource: [
					'invoice',
				],
				operation: [
					'getAll',
				],
			},
		},
	},
	{
		displayName: 'invoiceNumber',
		name: 'invoiceNumber',
		description: 'Retrieve all invoices with this invoice number',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'invoice',
				],
				operation: [
					'getAll',
				],
			},
		},
	},
	{
		displayName: 'startDate',
		name: 'startDate',
		description: 'Retrieve all invoices with a date equal or higher',
		type: 'number',
		default: 0,
		displayOptions: {
			show: {
				resource: [
					'invoice',
				],
				operation: [
					'getAll',
				],
			},
		},
	},
	{
		displayName: 'endDate',
		name: 'endDate',
		description: 'Retrieve all invoices with a date equal or lower',
		type: 'number',
		default: 0,
		displayOptions: {
			show: {
				resource: [
					'invoice',
				],
				operation: [
					'getAll',
				],
			},
		},
	},
	{
		displayName: 'Contact[id]',
		name: 'contact[id]',
		description: 'Retrieve all invoices with this contact. Must be provided with contact[objectName].',
		type: 'number',
		default: 0,
		displayOptions: {
			show: {
				resource: [
					'invoice',
				],
				operation: [
					'getAll',
				],
			},
		},
	},
	{
		displayName: 'contact[objectName]',
		name: 'contact[objectName]',
		description: 'Only required if contact[id] was provided. "Contact" should be used as value.',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'invoice',
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
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: [
					'invoice',
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
					'invoice',
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
	//    invoice: getIsInvoicePartiallyPaid
	// ----------------------------------------
	{
		displayName: 'Invoice ID',
		name: 'invoiceId',
		description: 'ID of invoice to return',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: {
				resource: [
					'invoice',
				],
				operation: [
					'getIsInvoicePartiallyPaid',
				],
			},
		},
	},

	// ----------------------------------------
	//          invoice: invoiceGetPdf
	// ----------------------------------------
	{
		displayName: 'Invoice ID',
		name: 'invoiceId',
		description: 'ID of invoice from which you want the pdf',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: {
				resource: [
					'invoice',
				],
				operation: [
					'invoiceGetPdf',
				],
			},
		},
	},

	// ----------------------------------------
	//          invoice: invoiceSendBy
	// ----------------------------------------
	{
		displayName: 'Invoice ID',
		name: 'invoiceId',
		description: 'ID of invoice to mark as sent',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: {
				resource: [
					'invoice',
				],
				operation: [
					'invoiceSendBy',
				],
			},
		},
	},
	{
		displayName: 'Send Type',
		name: 'sendType',
		description: 'Specifies the way in which the invoice was sent to the customer. Accepts "VPR" (print), "VP" (postal), "VM" (mail) and "VPDF" (downloaded pfd).',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'invoice',
				],
				operation: [
					'invoiceSendBy',
				],
			},
		},
	},
	{
		displayName: 'Send Draft',
		name: 'sendDraft',
		description: 'ID of invoice to mark as sent',
		type: 'boolean',
		required: true,
		default: false,
		displayOptions: {
			show: {
				resource: [
					'invoice',
				],
				operation: [
					'invoiceSendBy',
				],
			},
		},
	},

	// ----------------------------------------
	//           invoice: markAsSent
	// ----------------------------------------
	{
		displayName: 'Invoice ID',
		name: 'invoiceId',
		description: 'ID of invoice to mark as sent',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: {
				resource: [
					'invoice',
				],
				operation: [
					'markAsSent',
				],
			},
		},
	},

	// ----------------------------------------
	//          invoice: sendViaEMail
	// ----------------------------------------
	{
		displayName: 'Invoice ID',
		name: 'invoiceId',
		description: 'ID of invoice to be sent via email',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: {
				resource: [
					'invoice',
				],
				operation: [
					'sendViaEMail',
				],
			},
		},
	},
	{
		displayName: 'To Email',
		name: 'toEmail',
		description: 'The recipient of the email',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'invoice',
				],
				operation: [
					'sendViaEMail',
				],
			},
		},
	},
	{
		displayName: 'Subject',
		name: 'subject',
		description: 'The subject of the email',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'invoice',
				],
				operation: [
					'sendViaEMail',
				],
			},
		},
	},
	{
		displayName: 'Text',
		name: 'text',
		description: 'The text of the email. Can contain html.',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'invoice',
				],
				operation: [
					'sendViaEMail',
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
					'invoice',
				],
				operation: [
					'sendViaEMail',
				],
			},
		},
		options: [
			{
				displayName: 'Copy',
				name: 'copy',
				type: 'boolean',
				default: false,
				description: 'Should a copy of this email be sent to you?',
			},
			{
				displayName: 'Additional Attachments',
				name: 'additionalAttachments',
				type: 'string',
				default: '',
				description: 'Additional attachments to the mail. String of IDs of existing documents in your * sevdesk account separated by ","',
			},
			{
				displayName: 'CC Email',
				name: 'ccEmail',
				type: 'string',
				default: '',
				description: 'String of mail addresses to be put as cc separated by ","',
			},
			{
				displayName: 'BCC Email',
				name: 'bccEmail',
				type: 'string',
				default: '',
				description: 'String of mail addresses to be put as bcc separated by ","',
			},
		],
	},
];
