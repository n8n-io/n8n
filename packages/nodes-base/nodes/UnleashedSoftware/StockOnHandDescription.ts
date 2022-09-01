import { INodeProperties } from 'n8n-workflow';

export const stockOnHandOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['stockOnHand'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get a stock on hand',
				action: 'Get a stock on hand',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all stocks on hand',
				action: 'Get all stocks on hand',
			},
		],
		default: 'getAll',
	},
];

export const stockOnHandFields: INodeProperties[] = [
	/* ------------------------------------------------------------------------- */
	/*                                stockOnHand:get                            */
	/* ------------------------------------------------------------------------- */
	{
		displayName: 'Product ID',
		name: 'productId',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['get'],
				resource: ['stockOnHand'],
			},
		},
		default: '',
	},
	/* ------------------------------------------------------------------------- */
	/*                                stockOnHand:getAll                         */
	/* ------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['stockOnHand'],
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
				operation: ['getAll'],
				resource: ['stockOnHand'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 1000,
		},
		default: 100,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['stockOnHand'],
			},
		},
		options: [
			{
				displayName: 'As at Date',
				name: 'asAtDate',
				type: 'dateTime',
				default: '',
				description: 'Returns the stock on hand for a specific date',
			},
			{
				displayName: 'Is Assembled',
				name: 'IsAssembled',
				type: 'boolean',
				default: false,
				description:
					'Whether the AvailableQty will also include the quantity that can be assembled',
			},
			{
				displayName: 'Modified Since',
				name: 'modifiedSince',
				type: 'dateTime',
				default: '',
				description: 'Returns stock on hand values modified after a specific date',
			},
			{
				displayName: 'Order By',
				name: 'orderBy',
				type: 'string',
				default: '',
				description:
					'Orders the list by a specific column, by default the list is ordered by productCode',
			},
			{
				displayName: 'Product ID',
				name: 'productId',
				type: 'string',
				default: '',
				description:
					'Returns products with the specific Product Guid. You can enter multiple product IDs separated by commas.',
			},
			{
				displayName: 'Warehouse Code',
				name: 'warehouseCode',
				type: 'string',
				default: '',
				description: 'Returns stock on hand for a specific warehouse code',
			},
			{
				displayName: 'Warehouse Name',
				name: 'warehouseName',
				type: 'string',
				default: '',
				description: 'Returns stock on hand for a specific warehouse name',
			},
		],
	},
];
