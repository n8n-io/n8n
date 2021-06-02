import {
	INodeProperties,
} from 'n8n-workflow';

export const pushFields = [
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		displayOptions: {
			show: {
				operation: [
					'push',
				],
			},
		},
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Repository',
				name: 'repositoryPath',
				type: 'string',
				default: '',
				placeholder: 'https://github.com/n8n-io/n8n',
				description: 'The URL or path of the repository to push to.',
			},
		],
	},
] as INodeProperties[];
