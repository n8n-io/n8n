import {
	INodeProperties,
} from 'n8n-workflow';

export const voucherOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'voucher',
				],
			},
		},
		options: [
			{
				name: 'Book',
				value: 'bookVoucher',
				description: 'This endpoint can be used to book vouchers.<br> Vouchers are booked on payment accounts where (bank) transactions are located and might be linked to the transactions by using this endpoint.<br> For more detailed information about booking vouchers, please refer to <a href="https://5677.extern.sevdesk.dev/apiOverview/index.html#/doc-vouchers#booking">this</a> section of our API-Overview',
			},
			{
				name: 'Create By Factory',
				value: 'createByFactory',
				description: 'Creates a voucher together with positions and discounts',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Returns a single voucher',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'There are a multitude of parameter which can be used to filter. A few of them are attached but for a complete list please check out <a href="https://5677.extern.sevdesk.dev/apiOverview/index.html#/doc-vouchers#filtering">this</a> list.',
			},
			{
				name: 'Upload File',
				value: 'voucherUploadFile',
				description: 'Upload a file which can be attached to a voucher afterwards.<br> The filename you receive in the response of this request, can be used in the request which creates a voucher.<br> For a detailed explanation of how to attach a file to a voucher, visit <a href="https://5677.extern.sevdesk.dev/apiOverview/index.html#/doc-vouchers#document">this</a> section of our API-Overview',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an existing voucher',
			},
		],
		default: 'get',
	},
];

export const voucherFields: INodeProperties[] = [
	// ----------------------------------------
	//              voucher: book
	// ----------------------------------------
	{
		displayName: 'Voucher ID',
		name: 'voucherId',
		description: 'ID of voucher to book',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: {
				resource: [
					'voucher',
				],
				operation: [
					'bookVoucher',
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
					'voucher',
				],
				operation: [
					'bookVoucher',
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
					'voucher',
				],
				operation: [
					'bookVoucher',
				],
			},
		},
	},
	{
		displayName: 'Type',
		name: 'type',
		description: 'Define a type for the booking. The following type abbreviations are available (abbreviation <-> meaning).<ul><li>N <-> Normal booking / partial booking</li><li>CB <-> Reduced amount due to discount (skonto)</li><li>CF <-> Reduced/Higher amount due to currency fluctuations</li><li>O <-> Reduced/Higher amount due to other reasons</li><li>OF <-> Higher amount due to reminder charges</li><li>MTC <-> Reduced amount due to the monetary traffic costs</li></ul>',
		type: 'dateTime',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'voucher',
				],
				operation: [
					'bookVoucher',
				],
			},
		},
	},
	{
		displayName: 'Check Account',
		name: 'checkAccount',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'voucher',
				],
				operation: [
					'bookVoucher',
				],
			},
		},
		options: [
			{
				displayName: 'ID',
				name: 'id',
				type: 'number',
				default: 0,
				description: 'Unique identifier of the check account',
			},
			{
				displayName: 'Object Name',
				name: 'objectName',
				type: 'string',
				default: 'CheckAccount',
				description: 'Model name, which is "CheckAccount"',
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
				resource: [
					'voucher',
				],
				operation: [
					'bookVoucher',
				],
			},
		},
		options: [
			{
				displayName: 'Check account transaction',
				name: 'checkAccountTransaction',
				type: 'collection',
				default: 0,
				description: 'The check account transaction on which should be booked. The transaction will be linked to the voucher.',
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
	//              voucher: createByFactory
	// ----------------------------------------
	{
		displayName: 'Status',
		name: 'status',
		description: 'Please have a look in our <a href="https://5677.extern.sevdesk.dev/apiOverview/index.html#/doc-vouchers#types">API-Overview</a> to see what the different status codes mean. One of "50", "100", "1000"',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: {
				resource: [
					'voucher',
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
		description: 'Tax type of the invoice. There are four tax types: <ol> <li>default - Umsatzsteuer ausweisen</li> <li>eu - Steuerfreie innergemeinschaftliche Lieferung (Europäische Union)</li> <li>noteu - Steuerschuldnerschaft des Leistungsempfängers (außerhalb EU, z. B. Schweiz)</li> <li>custom - Using custom tax set Tax rates are heavily connected to the tax type used.</li> </ol>',
		type: 'string',
		required: true,
		default: 'default',
		displayOptions: {
			show: {
				resource: [
					'voucher',
				],
				operation: [
					'createByFactory',
				],
			},
		},
	},
	{
		displayName: 'Credit/Debit',
		name: 'creditDebit',
		description: 'Defines if your voucher is a credit (C) or debit (D)',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'voucher',
				],
				operation: [
					'createByFactory',
				],
			},
		},
	},
	{
		displayName: 'Voucher Type',
		name: 'voucherType',
		description: 'Type of the voucher. For more information on the different types, check <a href="https://5677.extern.sevdesk.dev/apiOverview/index.html#/doc-vouchers#types">this</a> section of our API-Overview. One of "VOU", "RV".',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'voucher',
				],
				operation: [
					'createByFactory',
				],
			},
		},
	},
	{
		displayName: 'Voucher Positions Save',
		name: 'voucherPosSave',
		description: 'List of Voucher Positions',
		type: 'json',
		required: true,
		default: 'null',
		displayOptions: {
			show: {
				resource: [
					'voucher',
				],
				operation: [
					'createByFactory',
				],
			},
		},
	},
	{
		displayName: 'Voucher Positions Delete',
		name: 'voucherPosDelete',
		description: 'The voucher positions you want to delete. If you don\'t have any, set to null.',
		type: 'json',
		required: true,
		default: 'null',
		displayOptions: {
			show: {
				resource: [
					'voucher',
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
		required: true,
		default: true,
		displayOptions: {
			show: {
				resource: [
					'voucher',
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
					'voucher',
				],
				operation: [
					'createByFactory',
				],
			},
		},
		options: [
			{
				displayName: 'Voucher Date',
				name: 'voucherDate',
				description: 'Needs to be provided as timestamp or dd.mm.yyyy',
				type: 'dateTime' || 'string',
				default: '',
			},
			{
				displayName: 'Supplier',
				name: 'supplier',
				description: 'The contact used in the voucher as a supplier. If you don\'t have a contact as a supplier, you can set this object to null.',
				type: 'collection',
				default: {},
				options: [
					{
						displayName: 'ID',
						name: 'id',
						description: 'Unique identifier of the contact',
						type: 'string',
						default: 0,
					},
					{
						displayName: 'Object Name',
						name: 'objectName',
						description: 'Model name, which is "Contact"',
						type: 'string',
						default: 'Contact',
					},
				],
			},
			{
				displayName: 'Supplier Name',
				name: 'supplierName',
				description: 'The supplier name. The value you provide here will determine what supplier name is shown for the voucher in case you did not provide a supplier.',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Description',
				name: 'description',
				description: 'The description of the voucher. Essentially the voucher number.',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Document',
				name: 'document',
				description: 'The document of the voucher.',
				type: 'collection',
				default: {},
				options: [
					{
						displayName: 'ID',
						name: 'id',
						description: 'Unique identifier of the document',
						type: 'string',
						default: 0,
					},
					{
						displayName: 'Object Name',
						name: 'objectName',
						description: 'Model name, which is "Document"',
						type: 'string',
						default: 'Document',
					},
				],
			},
			{
				displayName: 'Document Preview',
				name: 'documentPreview',
				description: 'The document preview of the voucher.',
				type: 'collection',
				default: {},
				options: [
					{
						displayName: 'ID',
						name: 'id',
						description: 'Unique identifier of the document',
						type: 'string',
						default: 0,
					},
					{
						displayName: 'Object Name',
						name: 'objectName',
						description: 'Model name, which is "Document"',
						type: 'string',
						default: 'Document',
					},
				],
			},
			{
				displayName: 'Pay Date',
				name: 'payDate',
				description: 'Needs to be timestamp or dd.mm.yyyy',
				type: 'dateTime' || 'string',
				default: '',
			},
			{
				displayName: 'Cost Centre',
				name: 'costCentre',
				description: 'Cost centre for the voucher',
				type: 'collection',
				default: {},
				options: [
					{
						displayName: 'ID',
						name: 'id',
						description: 'Unique identifier of the cost centre',
						type: 'string',
						default: 0,
					},
					{
						displayName: 'Object Name',
						name: 'objectName',
						description: 'Model name, which is "CostCentre"',
						type: 'string',
						default: 'CostCentre',
					},
				],
			},
			{
				displayName: 'Recurring Interval',
				name: 'recurringInterval',
				description: 'The DateInterval in which recurring vouchers are generated. Necessary attribute for all recurring vouchers.<br/>One of "P0Y0M1W", "P0Y0M2W", "P0Y1M0W", "P0Y3M0W", "P0Y6M0W", "P1Y0M0W", "P2Y0M0W", "P3Y0M0W", "P4Y0M0W", "P5Y0M0W"',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Recurring Start Date',
				name: 'recurringStartDate',
				description: 'The date when the recurring vouchers start being generated. Necessary attribute for all recurring vouchers.',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Recurring Next Voucher',
				name: 'recurringNextVoucher',
				description: 'The date when the next voucher start should be generated. Necessary attribute for all recurring vouchers.',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Recurring Last Voucher',
				name: 'recurringLastVoucher',
				description: 'The date when the last voucher was generated.',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Recurring End Date',
				name: 'recurringEndDate',
				description: 'The date when the recurring vouchers end being generated. Necessary attribute for all recurring vouchers.',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Enshrined',
				name: 'enshrined',
				description: 'Defines if and when voucher was enshrined. Enshrined vouchers can not be manipulated.',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Tax Set',
				name: 'taxSet',
				description: 'Tax set of the voucher. Needs to be added if you chose the tax type custom',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				options: [
					{
						displayName: 'ID',
						name: 'id',
						description: 'Unique identifier of the object',
						type: 'string',
						default: 0,
					},
					{
						displayName: 'Object Name',
						name: 'objectName',
						description: 'Model name, which is "TaxSet"',
						type: 'string',
						default: 'TaxSet',
					},
				],
			},
			{
				displayName: 'Payment Deadline',
				name: 'paymentDeadline',
				description: 'Payment deadline of the voucher',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Delivery Date',
				name: 'deliveryDate',
				description: 'Needs to be provided as timestamp or dd.mm.yyyy',
				type: 'dateTime' || 'string',
				default: '',
			},
			{
				displayName: 'Delivery Date Until',
				name: 'deliveryDateUntil',
				description: 'Needs to be provided as timestamp or dd.mm.yyyy',
				type: 'dateTime' || 'string',
				default: '',
			},
		],
	},
	{
		displayName: 'Optional Filename',
		name: 'file',
		type: 'string',
		description: 'Filename of a previously upload file which should be attached',
		required: false,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'voucher',
				],
				operation: [
					'createByFactory',
				],
			},
		},
	},

	// ----------------------------------------
	//               voucher: get
	// ----------------------------------------
	{
		displayName: 'Voucher ID',
		name: 'voucherId',
		description: 'ID of voucher to return',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: {
				resource: [
					'voucher',
				],
				operation: [
					'get',
				],
			},
		},
	},

	// ----------------------------------------
	//             voucher: getAll
	// ----------------------------------------

	/* {
		displayName: 'Status',
		name: 'status',
		description: 'Status of the vouchers to retrieve',
		type: 'number',
		default: 0,
		displayOptions: {
			show: {
				resource: [
					'voucher',
				],
				operation: [
					'getAll',
				],
			},
		},
	},
	{
		displayName: 'creditDebit',
		name: 'creditDebit',
		description: 'Define if you only want credit or debit vouchers',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'voucher',
				],
				operation: [
					'getAll',
				],
			},
		},
	},
	{
		displayName: 'descriptionLike',
		name: 'descriptionLike',
		description: 'Retrieve all vouchers with a description like this',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'voucher',
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
		description: 'Retrieve all vouchers with a date equal or higher',
		type: 'number',
		default: 0,
		displayOptions: {
			show: {
				resource: [
					'voucher',
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
		description: 'Retrieve all vouchers with a date equal or lower',
		type: 'number',
		default: 0,
		displayOptions: {
			show: {
				resource: [
					'voucher',
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
		description: 'Retrieve all vouchers with this contact. Must be provided with contact[objectName].',
		type: 'number',
		default: 0,
		displayOptions: {
			show: {
				resource: [
					'voucher',
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
					'voucher',
				],
				operation: [
					'getAll',
				],
			},
		},
	}, */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: [
					'voucher',
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
					'voucher',
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
	//               voucher: update
	// ----------------------------------------
	{
		displayName: 'Voucher ID',
		name: 'voucherId',
		description: 'ID of voucher to return',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: {
				resource: [
					'voucher',
				],
				operation: [
					'update',
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
					'voucher',
				],
				operation: [
					'createByFactory',
				],
			},
		},
		options: [

			{
				displayName: 'Status',
				name: 'status',
				description: 'Please have a look in our <a href="https://5677.extern.sevdesk.dev/apiOverview/index.html#/doc-vouchers#types">API-Overview</a> to see what the different status codes mean. One of "50", "100", "1000"',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'Tax Type',
				name: 'taxType',
				description: 'Tax type of the invoice. There are four tax types: <ol> <li>default - Umsatzsteuer ausweisen</li> <li>eu - Steuerfreie innergemeinschaftliche Lieferung (Europäische Union)</li> <li>noteu - Steuerschuldnerschaft des Leistungsempfängers (außerhalb EU, z. B. Schweiz)</li> <li>custom - Using custom tax set Tax rates are heavily connected to the tax type used.</li> </ol>',
				type: 'string',
				default: 'default',
			},
			{
				displayName: 'Credit/Debit',
				name: 'creditDebit',
				description: 'Defines if your voucher is a credit (C) or debit (D)',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Voucher Type',
				name: 'voucherType',
				description: 'Type of the voucher. For more information on the different types, check <a href="https://5677.extern.sevdesk.dev/apiOverview/index.html#/doc-vouchers#types">this</a> section of our API-Overview. One of "VOU", "RV".',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Voucher Date',
				name: 'voucherDate',
				description: 'Needs to be provided as timestamp or dd.mm.yyyy',
				type: 'dateTime' || 'string',
				default: '',
			},
			{
				displayName: 'Supplier',
				name: 'supplier',
				description: 'The contact used in the voucher as a supplier. If you don\'t have a contact as a supplier, you can set this object to null.',
				type: 'collection',
				default: {},
				options: [
					{
						displayName: 'ID',
						name: 'id',
						description: 'Unique identifier of the contact',
						type: 'string',
						default: 0,
					},
					{
						displayName: 'Object Name',
						name: 'objectName',
						description: 'Model name, which is "Contact"',
						type: 'string',
						default: 'Contact',
					},
				],
			},
			{
				displayName: 'Supplier Name',
				name: 'supplierName',
				description: 'The supplier name. The value you provide here will determine what supplier name is shown for the voucher in case you did not provide a supplier.',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Description',
				name: 'description',
				description: 'The description of the voucher. Essentially the voucher number.',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Document',
				name: 'document',
				description: 'The document of the voucher.',
				type: 'collection',
				default: {},
				options: [
					{
						displayName: 'ID',
						name: 'id',
						description: 'Unique identifier of the document',
						type: 'string',
						default: 0,
					},
					{
						displayName: 'Object Name',
						name: 'objectName',
						description: 'Model name, which is "Document"',
						type: 'string',
						default: 'Document',
					},
				],
			},
			{
				displayName: 'Document Preview',
				name: 'documentPreview',
				description: 'The document preview of the voucher.',
				type: 'collection',
				default: {},
				options: [
					{
						displayName: 'ID',
						name: 'id',
						description: 'Unique identifier of the document',
						type: 'string',
						default: 0,
					},
					{
						displayName: 'Object Name',
						name: 'objectName',
						description: 'Model name, which is "Document"',
						type: 'string',
						default: 'Document',
					},
				],
			},
			{
				displayName: 'Pay Date',
				name: 'payDate',
				description: 'Needs to be timestamp or dd.mm.yyyy',
				type: 'dateTime' || 'string',
				default: '',
			},
			{
				displayName: 'Cost Centre',
				name: 'costCentre',
				description: 'Cost centre for the voucher',
				type: 'collection',
				default: {},
				options: [
					{
						displayName: 'ID',
						name: 'id',
						description: 'Unique identifier of the cost centre',
						type: 'string',
						default: 0,
					},
					{
						displayName: 'Object Name',
						name: 'objectName',
						description: 'Model name, which is "CostCentre"',
						type: 'string',
						default: 'CostCentre',
					},
				],
			},
			{
				displayName: 'Recurring Interval',
				name: 'recurringInterval',
				description: 'The DateInterval in which recurring vouchers are generated. Necessary attribute for all recurring vouchers.<br/>One of "P0Y0M1W", "P0Y0M2W", "P0Y1M0W", "P0Y3M0W", "P0Y6M0W", "P1Y0M0W", "P2Y0M0W", "P3Y0M0W", "P4Y0M0W", "P5Y0M0W"',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Recurring Start Date',
				name: 'recurringStartDate',
				description: 'The date when the recurring vouchers start being generated. Necessary attribute for all recurring vouchers.',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Recurring Next Voucher',
				name: 'recurringNextVoucher',
				description: 'The date when the next voucher start should be generated. Necessary attribute for all recurring vouchers.',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Recurring Last Voucher',
				name: 'recurringLastVoucher',
				description: 'The date when the last voucher was generated.',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Recurring End Date',
				name: 'recurringEndDate',
				description: 'The date when the recurring vouchers end being generated. Necessary attribute for all recurring vouchers.',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Enshrined',
				name: 'enshrined',
				description: 'Defines if and when voucher was enshrined. Enshrined vouchers can not be manipulated.',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Tax Set',
				name: 'taxSet',
				description: 'Tax set of the voucher. Needs to be added if you chose the tax type custom',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				options: [
					{
						displayName: 'ID',
						name: 'id',
						description: 'Unique identifier of the object',
						type: 'string',
						default: 0,
					},
					{
						displayName: 'Object Name',
						name: 'objectName',
						description: 'Model name, which is "TaxSet"',
						type: 'string',
						default: 'TaxSet',
					},
				],
			},
			{
				displayName: 'Payment Deadline',
				name: 'paymentDeadline',
				description: 'Payment deadline of the voucher',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Delivery Date',
				name: 'deliveryDate',
				description: 'Needs to be provided as timestamp or dd.mm.yyyy',
				type: 'dateTime' || 'string',
				default: '',
			},
			{
				displayName: 'Delivery Date Until',
				name: 'deliveryDateUntil',
				description: 'Needs to be provided as timestamp or dd.mm.yyyy',
				type: 'dateTime' || 'string',
				default: '',
			},
		],
	},
	// ----------------------------------------
	//              voucher: voucherUploadFile
	// ----------------------------------------
	{
		displayName: 'Upload File',
		name: 'file',
		description: 'Upload a file which can be attached to a voucher afterwards. The filename you receive in the response of this request, can be used in the request which creates a voucher. For a detailed explanation of how to attach a file to a voucher, visit <a href="https://5677.extern.sevdesk.dev/apiOverview/index.html#/doc-vouchers#document">this</a> section of our API-Overview.',
		type: 'string',
		required: false,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'voucher',
				],
				operation: [
					'voucherUploadFile',
				],
			},
		},
	},
];
