import {
	INodeProperties,
} from 'n8n-workflow';

export const voucherPoOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'voucherPo',
				],
			},
		},
		options: [
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Retrieve all voucher positions depending on the filters defined in the query',
			},
		],
		default: 'getAll',
	},
];

export const voucherPoFields: INodeProperties[] = [
	// ----------------------------------------
	//            voucherPo: getAll
	// ----------------------------------------

	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: [
					'VoucherPo',
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
					'voucherPo',
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
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'voucherPo',
				],
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				displayName: 'Voucher ID',
				name: 'voucherId',
				description: 'Retrieve all voucher positions belonging to this voucher. Must be provided with Voucher Object Name.',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'Voucher Object Name',
				name: 'voucherObjectName',
				description: 'Only required if voucher ID was provided. "Voucher" should be used as value.',
				type: 'string',
				default: 'Voucher',
			},
		],
	},
];
