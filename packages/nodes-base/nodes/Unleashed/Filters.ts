import { INodeProperties } from 'n8n-workflow';

export const stockOnHandFilters = [
	// ----------------------------------
	//         Stack on hands filter
	// ----------------------------------
	{
		displayName: 'Filters',
		name: 'stockOnHandFilters',
		type: 'collection',
		typeOptions: {
			multipleValueButtonText: 'Add Filter'
		},
		displayOptions: {
			show: {
				resource: ['stockOnHand']
			}
		},
		default: {},
		options: [
			{
				displayName: 'Warehouse Code',
				name: 'warehouseCode',
				type: 'string',
				default: '',
				description: 'Returns stock on hand for a specific warehouse code.'
			},
			{
				displayName: 'Warehouse Name',
				name: 'warehouseName',
				type: 'string',
				default: '',
				description: 'Returns stock on hand for a specific warehouse name.'
			},
			{
				displayName: 'As at date',
				name: 'asAtDate',
				type: 'dateTime',
				default: '',
				description: 'Returns the stock on hand for a specific date.'
			},
			{
				displayName: 'Modified since',
				name: 'modifiedSince',
				type: 'dateTime',
				default: '',
				description:
					'Returns stock on hand values modified after a specific date.'
			},
			{
				displayName: 'Order by',
				name: 'orderBy',
				type: 'string',
				default: '',
				description:
					'Orders the list by a specific column, by default the list is ordered by productCode.'
			},
			{
				displayName: 'Is assembled',
				name: 'IsAssembled',
				type: 'boolean',
				default: '',
				description:
					'If set to True, the AvailableQty will also include the quantity that can be assembled.'
			},
			{
				displayName: 'Product Id',
				name: 'productId',
				type: 'string',
				default: '',
				description:
					'Returns products with the specific Product Guid. You can enter multiple product Ids separated by commas.'
			}
		]
	}
] as INodeProperties[];

export const salesOrdersFilters = [
	// ----------------------------------
	// Sales orders options
	// ----------------------------------
	{
		displayName: 'Filters',
		name: 'salesOrdersFilters',
		type: 'collection',
		typeOptions: {
			multipleValueButtonText: 'Add Filter'
		},
		displayOptions: {
			show: {
				resource: ['salesOrders']
			}
		},
		default: {},
		options: [
			{
				displayName: 'Customer ID',
				name: 'customerId',
				type: 'string',
				default: '',
				placeholder: 'XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX',
				description:
					'Only returns orders for a specified Customer GUID. The CustomerId can be specified as a list of comma-separated GUIDs'
			},
			{
				displayName: 'Customer Code',
				name: 'customerCode',
				type: 'string',
				default: '',
				description:
					'Returns orders that start with the specific customer code.'
			},
			{
				displayName: 'Start date',
				name: 'startDate',
				type: 'dateTime',
				default: '',
				description:
					'Returns orders with order date after the specified date. UTC.'
			},
			{
				displayName: 'End date',
				name: 'endDate',
				type: 'dateTime',
				default: '',
				description:
					'Returns orders with order date before the specified date. UTC.'
			},
			{
				displayName: 'Modified since',
				name: 'modifiedSince',
				type: 'dateTime',
				default: '',
				description:
					'Returns orders created or edited after a specified date, must be UTC format.'
			},
			{
				displayName: 'Order number',
				name: 'orderNumber',
				type: 'string',
				default: '',
				description:
					'Returns a single order with the specified order number. If set, it overrides all other filters.'
			},
			{
				displayName: 'Order status',
				name: 'orderStatus',
				type: 'multiOptions',
				options: [
					{
						name: 'Completed',
						value: 'Completed'
					},
					{
						name: 'Backordered',
						value: 'Backordered'
					},
					{
						name: 'Parked',
						value: 'Parked'
					},
					{
						name: 'Placed',
						value: 'Placed'
					},
					{
						name: 'Deleted',
						value: 'Deleted'
					}
				],
				default: [],
				required: false,
				description:
					'Returns orders with the specified status. If no orderStatus filter is specified, then we exclude “Deleted” by default.'
			}
		]
	}
] as INodeProperties[];
