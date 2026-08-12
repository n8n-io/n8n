/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import { NodeConnectionTypes, type INodeTypeDescription } from 'n8n-workflow';

import * as activity from './activity';
import * as contact from './contact';
import * as custom from './custom';
import * as opportunity from './opportunity';

export const versionDescription: INodeTypeDescription = {
	displayName: 'Odoo',
	name: 'odoo',
	icon: 'file:odoo.svg',
	group: ['transform'],
	version: 2,
	subtitle: '={{ $parameter["operation"] + ": " + $parameter["resource"] }}',
	description: 'Consume Odoo API',
	defaults: { name: 'Odoo' },
	inputs: [NodeConnectionTypes.Main],
	outputs: [NodeConnectionTypes.Main],
	credentials: [
		{
			name: 'odooApiKeyApi',
			required: true,
			displayOptions: { show: { authentication: ['odooApiKeyApi'] } },
		},
		{
			name: 'odooApi',
			required: true,
			displayOptions: { show: { authentication: ['odooApi'] } },
		},
	],
	properties: [
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'options',
			options: [
				{
					name: 'API Key (Recommended)',
					value: 'odooApiKeyApi',
					description:
						'Use an API key — generate at Settings &gt; Technical &gt; API Keys. Requires Odoo 19+.',
				},
				{
					name: 'Username & Password',
					value: 'odooApi',
					description: 'Legacy authentication using username and password',
				},
			],
			default: 'odooApiKeyApi',
		},
		{
			displayName: 'Resource',
			name: 'resource',
			type: 'options',
			noDataExpression: true,
			options: [
				{
					name: 'Activity',
					value: 'activity',
				},
				{
					name: 'Contact',
					value: 'contact',
				},
				{
					name: 'Custom Resource',
					value: 'custom',
				},
				{
					name: 'Opportunity',
					value: 'opportunity',
				},
			],
			default: 'contact',
		},

		...activity.description,
		...contact.description,
		...custom.description,
		...opportunity.description,
	],
};
