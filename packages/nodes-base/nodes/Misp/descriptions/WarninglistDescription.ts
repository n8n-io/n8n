import { INodeProperties } from 'n8n-workflow';

export const warninglistOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['warninglist'],
			},
		},
		noDataExpression: true,
		options: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get a warninglist',
			},
			{
				name: 'Get All',
				value: 'getAll',
				action: 'Get all warninglists',
			},
		],
		default: 'get',
	},
];

export const warninglistFields: INodeProperties[] = [
	// ----------------------------------------
	//             warninglist: get
	// ----------------------------------------
	{
		displayName: 'Warninglist ID',
		name: 'warninglistId',
		description: 'Numeric ID of the warninglist',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['warninglist'],
				operation: ['get'],
			},
		},
	},

	// ----------------------------------------
	//           warninglist: getAll
	// ----------------------------------------
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: ['warninglist'],
				operation: ['getAll'],
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
				resource: ['warninglist'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
	},
];
