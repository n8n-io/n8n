import {
	INodeProperties,
} from 'n8n-workflow';

export const listingOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		default: 'get',
		description: 'Operation to perform',
		options: [
			{
				name: 'Get',
				value: 'get',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'listing',
				],
			},
		},
	},
] as INodeProperties[];

export const listingFields = [
	{
		displayName: 'Type',
		name: 'type',
		type: 'options',
		required: true,
		default: 'trending',
		description: 'Type of listing to retrieve',
		options: [
			{
				name: 'Trending',
				value: 'trending',
			},
			{
				name: 'Best',
				value: 'best',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'listing',
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
		description: 'Return all results',
		displayOptions: {
			show: {
				resource: [
					'listing',
				],
				operation: [
					'get',
				],
				type: [
					'best',
				],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 5,
		description: 'The number of results to return',
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		displayOptions: {
			show: {
				resource: [
					'listing',
				],
				operation: [
					'get',
				],
				type: [
					'best',
				],
				returnAll: [
					false,
				],
			},
		},
	},
] as INodeProperties[];
