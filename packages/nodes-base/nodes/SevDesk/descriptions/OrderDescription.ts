import {
	INodeProperties,
} from 'n8n-workflow';

export const orderOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'order',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Creates an order to which positions can be added later',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Deletes an order',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Find order by ID. Returns a single order',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Retrieve orders. There are a multitude of parameter which can be used to filter. A few of them are attached but for a complete list please check out <a href="https://5677.extern.sevdesk.dev/apiOverview/index.html#/doc-orders#filtering">this</a> list.',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an existing order',
			},
		],
		default: 'get',
	},
];

export const orderFields: INodeProperties[] = [
	// ----------------------------------------
	//              order: create
	// ----------------------------------------
	{
		displayName: 'Order Number',
		name: 'orderNumber',
		description: 'The order number',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'order',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Contact',
		name: 'contact',
		description: 'The contact to which this communication way belongs',
		type: 'collection',
		required: true,
		default: {},
		displayOptions: {
			show: {
				resource: [
					'order',
				],
				operation: [
					'create',
				],
			},
		},
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
		displayName: 'Order Date',
		name: 'orderDate',
		description: 'Needs to be provided as timestamp or dd.mm.yyyy',
		type: 'dateTime' || 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'order',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Status',
		name: 'status',
		description: 'Please have a look in our <href="https://5677.extern.sevdesk.dev/apiOverview/index.html#/doc-orders#types">API-Overview</a> to see what the different status codes mean',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: {
				resource: [
					'order',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Header',
		name: 'header',
		description: 'Normally consist of prefix plus the order number',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'order',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Version',
		name: 'version',
		description: 'Version of the order. Can be used if you have multiple drafts for the same order. Should start with 0',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: {
				resource: [
					'order',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Small Settlement',
		name: 'smallSettlement',
		description: 'Defines if the client uses the small settlement scheme. If yes, the order must not contain any vat.',
		type: 'boolean',
		required: true,
		default: false,
		displayOptions: {
			show: {
				resource: [
					'order',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Contact Person',
		name: 'contactPerson',
		description: 'The user who acts as a contact person for the order',
		type: 'collection',
		required: true,
		default: {},
		displayOptions: {
			show: {
				resource: [
					'order',
				],
				operation: [
					'create',
				],
			},
		},
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
				description: 'Model name, which is "SevUser"',
				type: 'string',
				default: 'SevUser',
			},
		],
	},
	{
		displayName: 'Tax Text',
		name: 'taxText',
		description: 'A common tax text would be "Umsatzsteuer 19%"',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'order',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Tax Type',
		name: 'taxType',
		description: 'Tax type of the order. There are four tax types: <ol><li>default - Umsatzsteuer ausweisen</li><li>eu - Steuerfreie innergemeinschaftliche Lieferung (Europäische Union)</li><li>noteu - Steuerschuldnerschaft des Leistungsempfängers (außerhalb EU, z. B. Schweiz)</li><li>custom - Using custom tax set Tax rates are heavily connected to the tax type used.</li></ol>',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'order',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Currency',
		name: 'currency',
		description: 'Currency used in the order. Needs to be currency code according to ISO-4217',
		type: 'string',
		required: true,
		default: 'EUR',
		displayOptions: {
			show: {
				resource: [
					'order',
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
					'order',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				displayName: 'Head Text',
				name: 'headText',
				description: 'Certain html tags can be used here to format your text',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Foot Text',
				name: 'footText',
				description: 'Certain html tags can be used here to format your text',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Delivery Terms',
				name: 'deliveryTerms',
				description: 'Delivery terms of the order',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Payment Terms',
				name: 'paymentTerms',
				description: 'Payment terms of the order',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Origin',
				name: 'origin',
				description: 'Payment terms of the order',
				type: 'collection',
				default: {},
				options: [
					{
						displayName: 'ID',
						name: 'id',
						description: 'Unique identifier of the object',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Object Name',
						name: 'objectName',
						description: 'Model name of the object. Could be "Order".',
						type: 'string',
						default: '',
					},
				],
			},
			{
				displayName: 'Tax Set',
				name: 'taxSet',
				description: 'Tax set of the order. Needs to be added if you chose the tax type custom.',
				type: 'collection',
				default: {},
				options: [
					{
						displayName: 'ID',
						name: 'id',
						description: 'Unique identifier of the object',
						type: 'string',
						default: '',
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
				displayName: 'Address Contact Ref',
				name: 'addressContactRef',
				description: 'Address contact reference.',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Order Type',
				name: 'orderType',
				description: 'Type of the order. For more information on the different types, check <a href="https://5677.extern.sevdesk.dev/apiOverview/index.html#/doc-orders#types">this</a> section of our API-Overview. One of "AN", "AB", "LI".',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Send Date',
				name: 'sendDate',
				description: 'The date the order was sent to the customer',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Address',
				name: 'address',
				description: 'Complete address of the recipient including name, street, city, zip and country. Line breaks can be used and will be displayed on the invoice pdf.',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Customer Internal Note',
				name: 'customerInternalNote',
				description: 'Internal note of the customer. Contains data entered into field "Referenz/Bestellnummer".',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Show Net',
				name: 'showNet',
				description: 'If true, the net amount of each position will be shown on the order. Otherwise gross amount.',
				type: 'boolean',
				default: true,
			},
			{
				displayName: 'Send Type',
				name: 'sendType',
				description: 'Type which was used to send the order. IMPORTANT: Please refer to the order section of the * API-Overview to understand how this attribute can be used before using it! One of "VP"R, "VP"DF, "VM", "VP".',
				type: 'string',
				default: '',
			},
		],
	},

	// ----------------------------------------
	//              order: delete
	// ----------------------------------------
	{
		displayName: 'Order ID',
		name: 'orderId',
		description: 'Id of order resource to delete',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: {
				resource: [
					'order',
				],
				operation: [
					'delete',
				],
			},
		},
	},

	// ----------------------------------------
	//                order: get
	// ----------------------------------------
	{
		displayName: 'Order ID',
		name: 'orderId',
		description: 'ID of order to return',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: {
				resource: [
					'order',
				],
				operation: [
					'get',
				],
			},
		},
	},

	// ----------------------------------------
	//              order: getAll
	// ----------------------------------------
	// {
	// 	displayName: 'Status',
	// 	name: 'status',
	// 	description: 'Status of the order',
	// 	type: 'number',
	// 	default: 0,
	// 	displayOptions: {
	// 		show: {
	// 			resource: [
	// 				'order',
	// 			],
	// 			operation: [
	// 				'getAll',
	// 			],
	// 		},
	// 	},
	// },
	// {
	// 	displayName: 'orderNumber',
	// 	name: 'orderNumber',
	// 	description: 'Retrieve all orders with this order number',
	// 	type: 'string',
	// 	default: '',
	// 	displayOptions: {
	// 		show: {
	// 			resource: [
	// 				'order',
	// 			],
	// 			operation: [
	// 				'getAll',
	// 			],
	// 		},
	// 	},
	// },
	// {
	// 	displayName: 'startDate',
	// 	name: 'startDate',
	// 	description: 'Retrieve all orders with a date equal or higher',
	// 	type: 'number',
	// 	default: 0,
	// 	displayOptions: {
	// 		show: {
	// 			resource: [
	// 				'order',
	// 			],
	// 			operation: [
	// 				'getAll',
	// 			],
	// 		},
	// 	},
	// },
	// {
	// 	displayName: 'endDate',
	// 	name: 'endDate',
	// 	description: 'Retrieve all orders with a date equal or lower',
	// 	type: 'number',
	// 	default: 0,
	// 	displayOptions: {
	// 		show: {
	// 			resource: [
	// 				'order',
	// 			],
	// 			operation: [
	// 				'getAll',
	// 			],
	// 		},
	// 	},
	// },
	// {
	// 	displayName: 'Contact ID',
	// 	name: 'contactId',
	// 	description: 'Retrieve all orders with this contact. Must be provided with Contact Object Name.',
	// 	type: 'number',
	// 	default: 0,
	// 	displayOptions: {
	// 		show: {
	// 			resource: [
	// 				'order',
	// 			],
	// 			operation: [
	// 				'getAll',
	// 			],
	// 		},
	// 	},
	// },
	// {
	// 	displayName: 'Contact Object Name',
	// 	name: 'contactObjectName',
	// 	description: 'Only required if Contact ID was provided. "Contact" should be used as value.',
	// 	type: 'string',
	// 	default: 'Contact',
	// 	displayOptions: {
	// 		show: {
	// 			resource: [
	// 				'order',
	// 			],
	// 			operation: [
	// 				'getAll',
	// 			],
	// 		},
	// 	},
	// },
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: [
					'order',
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
					'order',
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
	//              order: update
	// ----------------------------------------
	{
		displayName: 'Order ID',
		name: 'orderId',
		description: 'ID of order to return',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: {
				resource: [
					'order',
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
					'order',
				],
				operation: [
					'update',
				],
			},
		},
		options: [
			{
				displayName: 'Order Number',
				name: 'orderNumber',
				description: 'The order number',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Contact',
				name: 'contact',
				description: 'The contact to which this communication way belongs',
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
				displayName: 'Order Date',
				name: 'orderDate',
				description: 'Needs to be provided as timestamp or dd.mm.yyyy',
				type: 'dateTime' || 'string',
				default: '',
			},
			{
				displayName: 'Status',
				name: 'status',
				description: 'Please have a look in our <href="https://5677.extern.sevdesk.dev/apiOverview/index.html#/doc-orders#types">API-Overview</a> to see what the different status codes mean',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'Header',
				name: 'header',
				description: 'Normally consist of prefix plus the order number',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Version',
				name: 'version',
				description: 'Version of the order. Can be used if you have multiple drafts for the same order. Should start with 0',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'Small Settlement',
				name: 'smallSettlement',
				description: 'Defines if the client uses the small settlement scheme. If yes, the order must not contain any vat.',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Contact Person',
				name: 'contactPerson',
				description: 'The user who acts as a contact person for the order',
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
						description: 'Model name, which is "SevUser"',
						type: 'string',
						default: 'SevUser',
					},
				],
			},
			{
				displayName: 'Tax Text',
				name: 'taxText',
				description: 'A common tax text would be "Umsatzsteuer 19%"',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Tax Type',
				name: 'taxType',
				description: 'Tax type of the order. There are four tax types: <ol><li>default - Umsatzsteuer ausweisen</li><li>eu - Steuerfreie innergemeinschaftliche Lieferung (Europäische Union)</li><li>noteu - Steuerschuldnerschaft des Leistungsempfängers (außerhalb EU, z. B. Schweiz)</li><li>custom - Using custom tax set Tax rates are heavily connected to the tax type used.</li></ol>',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Currency',
				name: 'currency',
				description: 'Currency used in the order. Needs to be currency code according to ISO-4217',
				type: 'string',
				default: 'EUR',
			},
			{
				displayName: 'Head Text',
				name: 'headText',
				description: 'Certain html tags can be used here to format your text',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Foot Text',
				name: 'footText',
				description: 'Certain html tags can be used here to format your text',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Delivery Terms',
				name: 'deliveryTerms',
				description: 'Delivery terms of the order',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Payment Terms',
				name: 'paymentTerms',
				description: 'Payment terms of the order',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Origin',
				name: 'origin',
				description: 'Payment terms of the order',
				type: 'collection',
				default: {},
				options: [
					{
						displayName: 'ID',
						name: 'id',
						description: 'Unique identifier of the object',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Object Name',
						name: 'objectName',
						description: 'Model name of the object. Could be "Order".',
						type: 'string',
						default: '',
					},
				],
			},
			{
				displayName: 'Tax Set',
				name: 'taxSet',
				description: 'Tax set of the order. Needs to be added if you chose the tax type custom.',
				type: 'collection',
				default: {},
				options: [
					{
						displayName: 'ID',
						name: 'id',
						description: 'Unique identifier of the object',
						type: 'string',
						default: '',
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
				displayName: 'Address Contact Ref',
				name: 'addressContactRef',
				description: 'Address contact reference.',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Order Type',
				name: 'orderType',
				description: 'Type of the order. For more information on the different types, check <a href="https://5677.extern.sevdesk.dev/apiOverview/index.html#/doc-orders#types">this</a> section of our API-Overview. One of "AN", "AB", "LI".',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Send Date',
				name: 'sendDate',
				description: 'The date the order was sent to the customer',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Address',
				name: 'address',
				description: 'Complete address of the recipient including name, street, city, zip and country. Line breaks can be used and will be displayed on the invoice pdf.',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Customer Internal Note',
				name: 'customerInternalNote',
				description: 'Internal note of the customer. Contains data entered into field "Referenz/Bestellnummer".',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Show Net',
				name: 'showNet',
				description: 'If true, the net amount of each position will be shown on the order. Otherwise gross amount.',
				type: 'boolean',
				default: true,
			},
			{
				displayName: 'Send Type',
				name: 'sendType',
				description: 'Type which was used to send the order. IMPORTANT: Please refer to the order section of the * API-Overview to understand how this attribute can be used before using it! One of "VP"R, "VP"DF, "VM", "VP".',
				type: 'string',
				default: '',
			},
		],
	},

];
