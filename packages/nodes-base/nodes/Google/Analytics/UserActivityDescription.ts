import {
	INodeProperties,
} from 'n8n-workflow';

export const userActivityOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'userActivity',
				],
			},
		},
		options: [
			{
				name: 'Search',
				value: 'search',
				description: 'Return user activity data.',
			},
		],
		default: 'search',
		description: 'The operation to perform.',
	},
];

export const userActivityFields: INodeProperties[] = [
	{
		displayName: 'View ID',
		name: 'viewId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getViews',
		},
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'userActivity',
				],
				operation: [
					'search',
				],
			},
		},
		placeholder: '123456',
		description: 'The View ID of Google Analytics.',
	},
	{
		displayName: 'User ID',
		name: 'userId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'userActivity',
				],
				operation: [
					'search',
				],
			},
		},
		placeholder: '123456',
		description: 'ID of a user.',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: [
					'search',
				],
				resource: [
					'userActivity',
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
					'search',
				],
				resource: [
					'userActivity',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 500,
		},
		default: 100,
		description: 'How many results to return.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				operation: [
					'search',
				],
				resource: [
					'userActivity',
				],
			},
		},
		options: [
			{
				displayName: 'Activity Types',
				name: 'activityTypes',
				type: 'multiOptions',
				options: [
					{
						name: 'Ecommerce',
						value: 'ECOMMERCE',
					},
					{
						name: 'Event',
						value: 'EVENT',
					},
					{
						name: 'Goal',
						value: 'GOAL',
					},
					{
						name: 'Pageview',
						value: 'PAGEVIEW',
					},
					{
						name: 'Screenview',
						value: 'SCREENVIEW',
					},
				],
				description: 'Type of activites requested.',
				default: [],
			},
		],
	},
];
