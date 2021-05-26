import {
	INodeProperties,
} from 'n8n-workflow';

export const promotionOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'promotion',
				],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
			},
			{
				name: 'Get All',
				value: 'getAll',
			},
		],
		default: 'get',
		description: 'Operation to perform',
	},
] as INodeProperties[];

export const promotionFields = [
	// ----------------------------------------
	//              promotion: get
	// ----------------------------------------
	{
		displayName: 'Promotion ID',
		name: 'promotionId',
		description: 'ID of the promotion to retrieve.',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'promotion',
				],
				operation: [
					'get',
				],
			},
		},
	},
	
	// ----------------------------------------
	//            promotion: getAll
	// ----------------------------------------
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Return all results.',
		displayOptions: {
			show: {
				resource: [
					'promotion',
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
		description: 'The number of results to return.',
		typeOptions: {
			minValue: 1,
		},
		displayOptions: {
			show: {
				resource: [
					'promotion',
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
] as INodeProperties[];
