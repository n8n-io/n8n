import {
	INodeProperties,
} from 'n8n-workflow';

export const spaceOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		default: 'getAll',
		description: 'Operation to perform.',
		options: [
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Retrieve data on all the spaces in the<br>logged-in user\'s organization.',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'space',
				],
			},
		},
	},
] as INodeProperties[];

export const spaceFields = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Return all results.',
		displayOptions: {
			show: {
				resource: [
					'space',
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
		default: 5,
		description: 'The number of results to return.',
		typeOptions: {
			minValue: 1,
			maxValue: 1000,
		},
		displayOptions: {
			show: {
				resource: [
					'space',
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
