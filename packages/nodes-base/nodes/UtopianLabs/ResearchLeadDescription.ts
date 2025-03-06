import type { INodeProperties } from 'n8n-workflow';

export const researchLeadFields: INodeProperties[] = [
	{
		displayName: 'Agent',
		name: 'agent',
		type: 'options',
		required: true,
		default: 'r1',
		options: [
			{
				name: 'Research Agent',
				value: 'r1',
			},
			{
				name: 'Research Agent Light',
				value: 'r1-light',
			},
		],
		description: 'The agent to use for the research run',
		displayOptions: {
			show: {
				operation: ['researchLead'],
			},
		},
	},
];
