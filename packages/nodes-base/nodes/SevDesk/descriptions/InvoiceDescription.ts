import {
	INodeProperties,
} from 'n8n-workflow';

export const invoiceOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
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
				name: 'Deprecated: Book',
				value: 'deprecatedBook',
				description: 'This endpoint can be used to book invoices.<br> Invoices are booked on payment accounts where (bank) transactions are located and might be linked to the transactions by using this endpoint.<br> For more detailed information about booking invoices, please refer to <a href="https://5677.extern.sevdesk.dev/apiOverview/index.html#/doc-vouchers#booking">this</a> section of our API-Overview.<br> Be aware, that this endpoint is deprecated and the new endpoint "bookAmount" should be used instead',
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
				default: '',
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
	//         invoice: deprecatedBook
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
					'deprecatedBook',
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
];
