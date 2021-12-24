import {
	ContactProperties,
} from '../../Interfaces';

export const contactGetDescription: ContactProperties = [
	{
		displayName: 'Contact ID',
		name: 'id',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
				operation: [
					'get',
				],
			},
		},
		default: '',
		description: 'Get specific contact by ID',
	},
];
