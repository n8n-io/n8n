import {
	INodeProperties,
} from 'n8n-workflow';

export const commitFields = [
	{
		displayName: 'Message',
		name: 'message',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'commit',
				],
			},
		},
		default: '',
		description: 'The commit message to use.',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		displayOptions: {
			show: {
				operation: [
					'commit',
				],
			},
		},
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Files',
				name: 'files',
				type: 'string',
				default: '',
				placeholder: '/data/file1.json',
				description: 'Comma separated list of paths of files or folders to commit.',
			},
		],
	},
] as INodeProperties[];
