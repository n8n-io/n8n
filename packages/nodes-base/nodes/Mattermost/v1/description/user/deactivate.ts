import {
	INodeProperties,
} from 'n8n-workflow';

const userDeactiveDescription: INodeProperties[] = [
	{
		displayName: 'User ID',
		name: 'userId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'user',
				],
				operation: [
					'deactive',
				],
			},
		},
		default: '',
		description: 'User GUID',
	},
];

export { userDeactiveDescription };