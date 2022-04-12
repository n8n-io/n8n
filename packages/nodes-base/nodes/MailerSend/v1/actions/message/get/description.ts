import {
	MessageProperties,
} from '../../Interfaces';

/* -------------------------------------------------------------------------- */
/*                                message:get                                 */
/* -------------------------------------------------------------------------- */
export const messageDescription: MessageProperties = [
	{
		displayName: 'Message ID',
		name: 'messageID',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the Email to check',
		displayOptions: {
			show: {
				resource: [
					'message',
				],
				operation: [
					'get',
				],
			},
		},
	},
];

