import {
	ContactProperties,
} from '../../Interfaces';

export const contactAddContactDescription: ContactProperties = [
	{
		displayName: 'Customer Id',
		name: 'customerId',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
				operation: [
					'addContact',
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
				operation: [
					'addContact',
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
				operation: [
					'addContact',
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
					'contact',
				],
				operation: [
					'addContact',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Phone',
				name: 'phone',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Address',
				name: 'address1',
				type: 'string',
				default: '',
			},
			{
				displayName: 'City',
				name: 'city',
				type: 'string',
				default: '',
			},
			{
				displayName: 'State',
				name: 'state',
				type: 'string',
				default: '',
			},
			{
				displayName: 'ZIP',
				name: 'zip',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Notes',
				name: 'notes',
				type: 'string',
				default: '',
			},
		],
	},
];
