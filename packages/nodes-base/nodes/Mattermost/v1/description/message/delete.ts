import {
	INodeProperties,
} from 'n8n-workflow';

const messageDeleteDescription: INodeProperties[] = [
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
