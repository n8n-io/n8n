import type { INodeProperties } from 'n8n-workflow';

export const timingLeadFields: INodeProperties[] = [
	{
		displayName: 'Agent',
		name: 'agent',
		type: 'options',
		required: true,
		default: 'r1-timing',
		options: [
			{
				name: 'Timing Agent',
				value: 'r1-timing',
			},
			{
				name: 'Timing Agent Light',
				value: 'r1-timing-light',
			},
		],
		description: 'The agent to use for the timing run',
		displayOptions: {
			show: {
				operation: ['timingLead'],
			},
		},
	},
];
