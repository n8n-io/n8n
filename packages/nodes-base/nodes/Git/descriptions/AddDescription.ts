import {
	INodeProperties,
} from 'n8n-workflow';

export const addFields: INodeProperties[] = [
	{
		displayName: 'Paths to Add',
		name: 'pathsToAdd',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'add',
				],
			},
		},
		default: '',
		placeholder: 'README.md',
		description: 'Comma separated list of paths (absolute or relative to Repository Path) of files or folders to add.',
		required: true,
	},
];
