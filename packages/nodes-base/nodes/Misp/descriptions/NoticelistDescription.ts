import {
	INodeProperties,
} from 'n8n-workflow';

export const noticelistOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'noticelist',
				],
			},
		},
		noDataExpression: true,
		options: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get a noticelist',
			},
			{
				name: 'Get All',
				value: 'getAll',
				action: 'Get all noticelists',
			},
		],
		default: 'get',
	},
];

export const noticelistFields: INodeProperties[] = [
	// ----------------------------------------
	//             noticelist: get
	// ----------------------------------------
	{
		displayName: 'Noticelist ID',
		name: 'noticelistId',
		description: 'Numeric ID of the noticelist',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'noticelist',
				],
				operation: [
					'get',
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
					'noticelist',
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
					'noticelist',
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
