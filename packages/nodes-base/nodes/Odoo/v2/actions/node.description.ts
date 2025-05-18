/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import type { INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import * as custom from './custom';

export const description: INodeTypeDescription = {
	displayName: 'Odoo',
	name: 'odoo',
	icon: 'file:odoo.svg',
	group: ['transform'],
	version: 2,
	description: 'Consume Odoo API',
	subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
	defaults: {
		name: 'Odoo',
	},
	usableAsTool: true,
	inputs: [NodeConnectionTypes.Main],
	outputs: [NodeConnectionTypes.Main],
	credentials: [
		{
			name: 'odooApi',
			required: true,
		},
	],
	properties: [
		{
			displayName: 'Resource',
			name: 'resource',
			type: 'options',
			default: 'custom',
			noDataExpression: true,
			options: [
				{
					name: 'Custom Resource',
					value: 'custom',
				},
			],
		},
		{
			displayName: 'Custom Resource Name or ID',
			name: 'customResource',
			type: 'options',
			description:
				'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
			default: '',
			typeOptions: {
				loadOptionsMethod: 'getModels',
			},
			displayOptions: {
				show: {
					resource: ['custom'],
				},
			},
		},
		...custom.description,
	],
};
