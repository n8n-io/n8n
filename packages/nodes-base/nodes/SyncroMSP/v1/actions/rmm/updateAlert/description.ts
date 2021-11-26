import {
	RmmProperties,
} from '../../Interfaces';

export const rmmUpdateAlertDescription: RmmProperties = [
	{
		displayName: 'RMM Alert Id',
		name: 'id',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'rmm',
				],
				operation: [
					'updateAlert',
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
					'updateAlert',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Customer id',
				name: 'customer_id',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Asset Id',
				name: 'asset_id',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Resolved',
				name: 'resolved',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'string',
				options : [
					{
						name: 'Active',
						value: 'active',
					},
					{
						name: 'Resolved',
						value: 'resolved',
					},
					{
						name: 'All',
						value: 'all',
					},
				],
				default: '',
			},
		],
	},
];
