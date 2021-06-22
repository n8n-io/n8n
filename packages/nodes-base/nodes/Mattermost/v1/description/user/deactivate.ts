import {
	INodeProperties,
} from 'n8n-workflow';

const userDeactivateDescription: INodeProperties[] = [
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

export { userDeactivateDescription };