import {
	INodeProperties,
} from 'n8n-workflow';

export const tagFields = [
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'tag',
				],
			},
		},
		default: '',
		description: 'The name of the tag to create.',
		required: true,
	},
] as INodeProperties[];
