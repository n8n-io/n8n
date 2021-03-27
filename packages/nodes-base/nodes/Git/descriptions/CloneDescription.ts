import {
	INodeProperties,
} from 'n8n-workflow';

export const cloneFields = [
	{
		displayName: 'Repository Path',
		name: 'repositoryPath',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'clone',
				],
			},
		},
		default: '',
		placeholder: 'https://github.com/n8n-io/n8n',
		description: 'The path of the remote repository to clone.',
		required: true,
	},

] as INodeProperties[];
