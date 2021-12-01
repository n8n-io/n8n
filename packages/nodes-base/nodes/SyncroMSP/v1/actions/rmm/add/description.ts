import {
	RmmProperties,
} from '../../Interfaces';

export const rmmAddDescription: RmmProperties = [
	{
		displayName: 'Asset ID',
		name: 'assetId',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'rmm',
				],
				operation: [
					'add',
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Customer ID',
		name: 'customerId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getCustomers',
		},
		options: [],
		displayOptions: {
			show: {
				resource: [
					'rmm',
				],
				operation: [
					'add',
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Description',
		name: 'description',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'rmm',
				],
				operation: [
					'add',
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Resolved',
		name: 'resolved',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'rmm',
				],
				operation: [
					'add',
				],
			},
		},
		default: false,
	},
	{
		displayName: 'Status',
		name: 'status',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'rmm',
				],
				operation: [
					'add',
				],
			},
		},
		options : [
			{
				name: 'Active',
				value: 'active',
			},
			{
				name: 'All',
				value: 'all',
			},
			{
				name: 'Resolved',
				value: 'resolved',
			},
		],
		default: '',
	},
];
