import type { INodeProperties } from 'n8n-workflow';

export const qualifyLeadFields: INodeProperties[] = [
	{
		displayName: 'Agent',
		name: 'agent',
		type: 'options',
		required: true,
		default: 'r1-qualification',
		options: [
			{
				name: 'Qualification Agent',
				value: 'r1-qualification',
			},
			{
				name: 'Qualification Agent Light',
				value: 'r1-qualification-light',
			},
		],
		description: 'The agent to use for the qualification run',
		displayOptions: {
			show: {
				operation: ['qualifyLead'],
			},
		},
	},
];
