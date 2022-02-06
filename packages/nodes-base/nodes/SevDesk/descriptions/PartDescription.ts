import {
	INodeProperties,
} from 'n8n-workflow';

export const partOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'part',
				],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Returns a single part',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Retrieve all parts in your sevDesk inventory according to the applied filters',
			},
			{
				name: 'Part Get Stock',
				value: 'partGetStock',
				description: 'Returns the current stock amount of the given part',
			},
		],
		default: 'get',
	},
];

export const partFields: INodeProperties[] = [
	// ----------------------------------------
	//                part: get
	// ----------------------------------------
	{
		displayName: 'Part ID',
		name: 'partId',
		description: 'ID of part to return',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: {
				resource: [
					'part',
				],
				operation: [
					'get',
				],
			},
		},
	},

	// ----------------------------------------
	//               part: getAll
	// ----------------------------------------
	{
		displayName: 'partNumber',
		name: 'partNumber',
		description: 'Retrieve all parts with this part number',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'part',
				],
				operation: [
					'getAll',
				],
			},
		},
	},
	{
		displayName: 'Name',
		name: 'name',
		description: 'Retrieve all parts with this name',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'part',
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
					'part',
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
					'part',
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
	//            part: partGetStock
	// ----------------------------------------
	{
		displayName: 'Part ID',
		name: 'partId',
		description: 'ID of part for which you want the current stock',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: {
				resource: [
					'part',
				],
				operation: [
					'partGetStock',
				],
			},
		},
	},
];
