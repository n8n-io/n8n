import type { INodeProperties } from 'n8n-workflow';

// Common fields shared across operations
export const commonFields: INodeProperties[] = [
	{
		displayName: 'Lead Company Website',
		name: 'leadCompanyWebsite',
		type: 'string',
		required: true,
		default: '',
		description: "The website of the lead's company",
	},
	{
		displayName:
			'To use the result of this agent run, add a Wait node and set it to "On Webhook Call". <strong>Important:</strong> Make sure the Wait Node is set to <strong>POST</strong> .<br><br>The webhook URL will automatically be set by the default parameter.',
		name: 'waitNodeNotice',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'Callback Url',
		name: 'n8nCallbackUrl',
		type: 'string',
		required: true,
		default: '={{$execution.resumeUrl}}',
		description: 'The URL from the Wait node to send the callback to',
	},
];

// Additional fields for all operations
export const additionalFields: INodeProperties[] = [
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		options: [
			{
				displayName: 'Lead Company Name',
				name: 'leadCompanyName',
				type: 'string',
				default: '',
				description: "The name of the lead's company",
			},
			{
				displayName: 'Lead Company Description',
				name: 'leadCompanyDescription',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: "A description of the lead's company",
			},
			{
				displayName: 'Lead Full Name',
				name: 'leadFullName',
				type: 'string',
				default: '',
				description: 'The full name of the lead',
			},
			{
				displayName: 'Lead Business Email Address',
				name: 'leadEmail',
				type: 'string',
				placeholder: 'name@company.com',
				default: '',
				description:
					'The business email address of the lead (not personal emails like gmail, hotmail, etc.)',
			},
			{
				displayName: 'Lead LinkedIn Profile URL',
				name: 'leadLinkedIn',
				type: 'string',
				default: '',
				description: 'The LinkedIn profile URL of the lead',
			},
			{
				displayName: 'Lead Job Title',
				name: 'leadJobTitle',
				type: 'string',
				default: '',
				description: 'The job title of the lead',
			},
			{
				displayName: 'Max Research Steps',
				name: 'maxResearchSteps',
				type: 'number',
				default: 5,
				description: 'The maximum number of research steps to perform (average is 2-3 steps)',
			},
			{
				displayName: 'Context',
				name: 'context',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: 'Additional context for the operation',
			},
			{
				displayName: 'Use Memory',
				name: 'useMemory',
				type: 'boolean',
				default: true,
				description: 'Whether to use previous research runs where applicable',
			},
		],
	},
];
