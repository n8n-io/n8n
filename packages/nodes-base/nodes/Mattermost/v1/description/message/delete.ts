import {
	MessageProperties,
} from '../../actions/Interfaces';

const messageDeleteDescription: MessageProperties = [
	{
		displayName: 'Post ID',
		name: 'postId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'message',
				],
				operation: [
					'delete',
				],
			},
		},
		default: '',
		description: 'ID of the post to delete',
	},
];

export { messageDeleteDescription };
