import type { INodeProperties } from 'n8n-workflow';

export const cloneFields: INodeProperties[] = [
	{
		displayName: 'Source Repository',
		name: 'sourceRepository',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['clone'],
			},
		},
		default: '',
		placeholder: 'https://github.com/n8n-io/n8n',
		description: 'The URL or path of the repository to clone',
		required: true,
	},
];
