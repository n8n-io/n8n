import type { INodeProperties } from 'n8n-workflow';

export const optionsCollection: INodeProperties = {
	displayName: 'Options',
	name: 'options',
	type: 'collection',
	placeholder: 'Add Field',
	default: {},
	options: [
		{
			displayName: 'Mode',
			name: 'mode',
			type: 'options',
			noDataExpression: true,
			options: [
				{
					name: 'Independently',
					value: 'independently',
					description: 'Execute each query independently',
				},
				{
					name: 'Multiple Queries',
					value: 'multiple',
					description: '<b>Default</b>. Sends multiple queries at once to database.',
				},
				{
					name: 'Transaction',
					value: 'transaction',
					description: 'Executes all queries in a single transaction',
				},
			],
			default: 'multiple',
			description:
				'The way queries should be sent to database. Can be used in conjunction with <b>Continue on Fail</b>. See <a href="https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.postgres/">the docs</a> for more examples',
		},
		{
			displayName: 'Output Large-Format Numbers As',
			name: 'largeNumbersOutput',
			type: 'options',
			options: [
				{
					name: 'Numbers',
					value: 'numbers',
				},
				{
					name: 'Text',
					value: 'text',
					description:
						'Use this if you expect numbers longer than 16 digits (otherwise numbers may be incorrect)',
				},
			],
			hint: 'Applies to NUMERIC and BIGINT columns only',
			default: 'text',
		},
	],
};
