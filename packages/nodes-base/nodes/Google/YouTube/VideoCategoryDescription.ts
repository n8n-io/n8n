import {
	INodeProperties,
} from 'n8n-workflow';

export const videoCategoryOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'videoCategory',
				],
			},
		},
		options: [

			{
				name: 'Get All',
				value: 'getAll',
				description: 'Retrieve all video categories',
			},
		],
		default: 'getAll',
		description: 'The operation to perform.',
	},
];

export const videoCategoryFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                 videoCategory:getAll                       */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Region Code',
		name: 'regionCode',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'videoCategory',
				],
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getCountriesCodes',
		},
		default: '',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'videoCategory',
				],
			},
		},
		default: false,
		description: 'If all results should be returned or only up to a given limit.',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'videoCategory',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 50,
		},
		default: 25,
		description: 'How many results to return.',
	},
];
