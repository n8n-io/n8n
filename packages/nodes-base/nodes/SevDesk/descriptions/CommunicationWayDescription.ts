import {
	INodeProperties,
} from 'n8n-workflow';

export const communicationWayOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'communicationWay',
				],
			},
		},
		options: [
			{
				name: 'Delete',
				value: 'delete',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Returns all communication ways which have been added up until now. Filters can be added.',
			},
		],
		default: 'getAll',
	},
];

export const communicationWayFields: INodeProperties[] = [
	// ----------------------------------------
	//         communicationWay: delete
	// ----------------------------------------
	{
		displayName: 'communicationWay ID',
		name: 'communicationWayId',
		description: 'Id of communication way resource to delete',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: {
				resource: [
					'communicationWay',
				],
				operation: [
					'delete',
				],
			},
		},
	},

	// ----------------------------------------
	//         communicationWay: getAll
	// ----------------------------------------
	{
		displayName: 'Contact[id]',
		name: 'contact[id]',
		description: 'ID of contact for which you want the communication ways',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'communicationWay',
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
		description: 'Object name. Only needed if you also defined the ID of a contact.',
		type: 'string',
		default: 'Contact',
		displayOptions: {
			show: {
				resource: [
					'communicationWay',
				],
				operation: [
					'getAll',
				],
			},
		},
	},
	{
		displayName: 'Type',
		name: 'type',
		description: 'Type of the communication ways you want to get',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'communicationWay',
				],
				operation: [
					'getAll',
				],
			},
		},
	},
	{
		displayName: 'Main',
		name: 'main',
		description: 'Define if you only want the main communication way',
		type: 'number',
		default: 0,
		displayOptions: {
			show: {
				resource: [
					'communicationWay',
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
					'communicationWay',
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
					'communicationWay',
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
