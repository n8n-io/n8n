import {
	BulkEmailProperties,
} from '../../Interfaces';

/* -------------------------------------------------------------------------- */
/*                                bulkEmail:get                               */
/* -------------------------------------------------------------------------- */
export const bulkEmailDescription: BulkEmailProperties = [
	{
		displayName: 'Bulk Email ID',
		name: 'bulkEmailID',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the Bulk Email returned in data when sent',
		displayOptions: {
			show: {
				resource: [
					'bulkEmail',
				],
				operation: [
					'get',
				],
			},
		},
	},
];

