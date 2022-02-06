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
				name: 'Deprecated Book',
				value: 'deprecatedBook',
				description: 'This endpoint can be used to book vouchers.<br> Vouchers are booked on payment accounts where (bank) transactions are located and might be linked to the transactions by using this endpoint.<br> For more detailed information about booking vouchers, please refer to <a href="https://5677.extern.sevdesk.dev/apiOverview/index.html#/doc-vouchers#booking">this</a> section of our API-Overview.<br> Be aware, that this endpoint is deprecated and the new endpoint "bookAmount" should be used instead',
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
				name: 'Voucher Upload File',
				value: 'voucherUploadFile',
				description: 'Upload a file which can be attached to a voucher afterwards.<br> The filename you receive in the response of this request, can be used in the request which creates a voucher.<br> For a detailed explanation of how to attach a file to a voucher, visit <a href="https://5677.extern.sevdesk.dev/apiOverview/index.html#/doc-vouchers#document">this</a> section of our API-Overview',
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

	// ----------------------------------------
	//         voucher: deprecatedBook
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
					'deprecatedBook',
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
	{
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
];
