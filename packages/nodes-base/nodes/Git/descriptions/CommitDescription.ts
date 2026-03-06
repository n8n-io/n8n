import type { INodeProperties } from 'n8n-workflow';

export const commitFields: INodeProperties[] = [
	{
		displayName: 'Message',
		name: 'message',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['commit'],
			},
		},
		default: '',
		description: 'The commit message to use',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		displayOptions: {
			show: {
				operation: ['commit'],
			},
		},
		placeholder: 'Add option',
		default: {},
		options: [
			{
				displayName: 'Branch',
				name: 'branch',
				type: 'string',
				default: '',
				placeholder: 'main',
				description:
					'The branch to switch to before committing. If empty or not set, will commit to current branch.',
			},
			{
				displayName: 'Paths to Add',
				name: 'pathsToAdd',
				type: 'string',
				default: '',
				placeholder: '/data/file1.json',
				description:
					'Comma-separated list of paths (absolute or relative to Repository Path) of files or folders to commit. If not set will all "added" files and folders be committed.',
			},
		],
	},
];
