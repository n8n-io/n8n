import {
	RmmProperties,
} from '../../Interfaces';

export const rmmAddAlertDescription: RmmProperties = [
	{
		displayName: 'Customer Id',
		name: 'customerId',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'rmm',
				],
				operation: [
					'addAlert',
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Asset Id',
		name: 'assetId',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'rmm',
				],
				operation: [
					'addAlert',
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
					'addAlert',
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
					'addAlert',
				],
			},
		},
		default: false,
	},
	{
		displayName: 'Status',
		name: 'status',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'rmm',
				],
				operation: [
					'addAlert',
				],
			},
		},
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
];
