import {
	INodeProperties
} from 'n8n-workflow';

export const inventoryOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'inventory',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				routing: {
					request: {
						method: 'POST',
						url: '/inventory',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'inventory',
								},
							},
						],
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/inventory/{{$parameter.inventoryId}}',
					},
					output: {
						postReceive: [
							{
								type: 'set',
								properties: {
									value: '={{ { "success": true } }}',
								},
							},
						],
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				routing: {
					request: {
						method: 'GET',
						url: '=/inventory/{{$parameter.inventoryId}}',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'inventory',
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
						url: '/inventory',
					},
					send: {
						paginate: true,
					},
				}
			},
			{
				name: 'Update',
				value: 'update',
				routing: {
					request: {
						method: 'PUT',
						url: '=/inventory/{{$parameter.inventoryId}}',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'inventory',
								},
							},
						],
					},
				},
			},
		],
		default: 'create',
	},
];


const getAllOperations: Array<INodeProperties> = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'inventory',
				],
				operation: [
					'getAll',
				],
			},
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	// {
	// 	displayName: 'Limit',
	// 	name: 'limit',
	// 	type: 'number',
	// 	displayOptions: {
	// 		show: {
	// 			resource: [
	// 				'inventory',
	// 			],
	// 			operation: [
	// 				'getAll',
	// 			],
	// 			returnAll: [
	// 				false,
	// 			],
	// 		},
	// 	},
	// 	typeOptions: {
	// 		minValue: 1,
	// 		maxValue: 100,
	// 	},
	// 	default: 20,
	// 	routing: {
	// 		send: {
	// 			type: 'query',
	// 			property: 'limit',
	// 		},
	// 		output: {
	// 			maxResults: '={{$value}}', // Set maxResults to the value of current parameter
	// 		},
	// 	},
	// 	description: 'Max number of results to return',
	// },
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'inventory',
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
	},
];

export const inventoryFields: INodeProperties[] = [
	...getAllOperations,
];
