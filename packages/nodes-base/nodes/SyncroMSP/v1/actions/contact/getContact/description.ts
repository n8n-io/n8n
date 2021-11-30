import {
	ContactProperties,
} from '../../Interfaces';

export const contactGetContactDescription: ContactProperties = [
	{
		displayName: 'Contact ID',
		name: 'id',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
				operation: [
					'getContact',
				],
			},
		},
		default: '',
		description: 'Get specific contact by ID',
	},
];
