import {
	ContactProperties,
} from '../../Interfaces';

export const contactDeleteDescription: ContactProperties = [
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
					'deleteContact',
				],
			},
		},
		default: '',
		description: 'Delete a specific contact by id',
	},
];
