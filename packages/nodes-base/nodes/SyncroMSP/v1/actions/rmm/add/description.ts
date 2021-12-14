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
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
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
		default: {},
		options: [
			{
				displayName: 'Resolved',
				name: 'resolved',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
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
				default: 'active',
			},
		],
	},
];
