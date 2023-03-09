import {
	INodeProperties
} from 'n8n-workflow';
import { filtersPreSendAction } from '../GenericFunctions';

export const transactionOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'transaction',
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
						url: '=/commerce/transactions/{{$parameter.transactionId}}',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'documents',
								},
							},
						],
					},
				},
			},
			{
				name: 'Get All',
				value: 'getAll',
				routing: {
					request: {
						method: 'GET',
						url: '/commerce/transactions',
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
		displayName: 'Transaction ID',
		name: 'transactionId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'transaction',
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
				resource: ['transaction'],
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
				resource: ['transaction'],
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
					'transaction',
				],
				operation: [
					'getAll',
				],
			},
		},
		options: [
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

export const transactionFields: INodeProperties[] = [
	...getOperations,
	...getAllOperations,
];
