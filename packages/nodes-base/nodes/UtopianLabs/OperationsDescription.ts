import type { INodeProperties } from 'n8n-workflow';

export const operations: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	options: [
		{
			name: 'Research a Lead',
			value: 'researchLead',
			description: 'Research a lead using AI',
			action: 'Research a lead',
		},
		{
			name: 'Qualify a Lead',
			value: 'qualifyLead',
			description: 'Determine if a lead is a good fit',
			action: 'Qualify a lead',
		},
		{
			name: 'Trigger a Timing Run',
			value: 'timingLead',
			description: "Check if it's the right time to contact a lead",
			action: 'Trigger a timing run',
		},
		{
			name: 'Categorize a Lead',
			value: 'categorizeLead',
			description: 'Categorize a lead based on their profile',
			action: 'Categorize a lead',
		},
		{
			name: 'Write an Email',
			value: 'writeEmail',
			description: 'Write a sales email to a lead',
			action: 'Write an email',
		},
		{
			name: 'Write an Email Sequence',
			value: 'writeEmailSequence',
			description: 'Write a sequence of sales emails',
			action: 'Write an email sequence',
		},
	],
	default: 'researchLead',
};
