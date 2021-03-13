import {
	INodeProperties,
} from 'n8n-workflow';

export const addFields = [
	{
		displayName: 'Paths',
		name: 'paths',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'add',
				],
			},
		},
		default: '',
		placeholder: '/data/file1.json',
		description: 'Comma separated list of paths of files or folders to add.',
		required: true,
	},

] as INodeProperties[];
