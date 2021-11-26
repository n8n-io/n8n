import {
	ContactProperties,
} from '../../Interfaces';

export const contactGetContactDescription: ContactProperties = [
	{
		displayName: 'Contact Id',
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
		description: 'get specific contact by id',
	},
];
