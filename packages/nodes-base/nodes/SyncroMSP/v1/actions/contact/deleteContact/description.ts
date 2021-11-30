import {
	ContactProperties,
} from '../../Interfaces';

export const contactDeleteDescription: ContactProperties = [
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
					'deleteContact',
				],
			},
		},
		default: '',
		description: 'Delete a specific contact by ID',
	},
];
