import type { INodeProperties } from 'n8n-workflow';

export const pullFields: INodeProperties[] = [
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		displayOptions: {
			show: {
				operation: ['pull'],
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
					'The branch to switch to before pulling. If not set, will pull from current branch.',
			},
		],
	},
];
