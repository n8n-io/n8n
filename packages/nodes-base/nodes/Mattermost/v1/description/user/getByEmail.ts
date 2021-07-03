import {
	INodeProperties,
} from 'n8n-workflow';

const userGetByEmailDescription: INodeProperties[] = [
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'user',
				],
				operation: [
					'getByEmail',
				],
			},
		},
		default: '',
		description: `User's email`,
	},


];

export { userGetByEmailDescription };