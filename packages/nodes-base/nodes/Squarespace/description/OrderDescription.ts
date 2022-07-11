import {
	INodeProperties
} from 'n8n-workflow';
import { filtersPreSendAction } from '../GenericFunctions';

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
				name: 'Get',
				value: 'get',
				routing: {
					request: {
						method: 'GET',
						url: '=/commerce/orders/{{$parameter.orderId}}',
					},
				},
			},
			{
				name: 'Get All',
				value: 'getAll',
				routing: {
					request: {
						method: 'GET',
						url: '/commerce/orders',
					},
					send: {
						paginate: true,
					},
				}
			},
		],
		default: 'getAll',
	},
];

const getOperations: Array<INodeProperties> = [
	{
		displayName: 'Order ID',
		name: 'orderId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'order',
				],
				operation: [
					'get',
				]
			},
		},
		default: '',
	},
];


const getAllOperations: Array<INodeProperties> = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['order'],
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
				resource: ['order'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 50,
		},
		default: 50,
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
				resource: [
					'order',
				],
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				displayName: 'Fulfillment Status',
				name: 'fulfillmentStatus',
				type: 'options',
				options: [
					{ name: 'Fulfilled', value: 'FULFILLED' },
					{ name: 'Canceled', value: 'CANCELED' },
					{ name: 'Pending', value: 'PENDING' },
				],
				default: 'PENDING',
				routing: {
					send: {
						type: 'query', property: 'fulfillmentStatus'
					}
				},
			},
			{
				displayName: 'Modified After',
				name: 'modifiedAfter',
				type: 'dateTime',
				default: '',
				description: 'Required when modifiedBefore is used',
				routing: {
					send: {
						type: 'query',
						property: 'modifiedAfter',
					}
				}
			},
			{
				displayName: 'Modified Before',
				name: 'modifiedBefore',
				type: 'dateTime',
				default: '',
				description: 'Required when modifiedAfter is used',
				routing: {
					send: {
						type: 'query',
						property: 'modifiedBefore',
					}
				}
			},
		],
		routing: {
			send: {
				preSend: [
					filtersPreSendAction
				]
			}
		}
	},
];

export const orderFields: INodeProperties[] = [
	...getOperations,
	...getAllOperations,
];
