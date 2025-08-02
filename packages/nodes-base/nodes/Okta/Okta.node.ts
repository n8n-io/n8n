import type { INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { userFields, userOperations } from './UserDescription';
import { getUsers } from './UserFunctions';

export class Okta implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Okta',
		name: 'okta',
		icon: { light: 'file:Okta.svg', dark: 'file:Okta.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Use the Okta API',
		defaults: {
			name: 'Okta',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'oktaApi',
				required: true,
			},
		],
		requestDefaults: {
			returnFullResponse: true,
			baseURL: '={{$credentials.url.replace(new RegExp("/$"), "")}}',
			headers: {},
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'User',
						value: 'user',
					},
				],
				default: 'user',
			},

			// USER
			...userOperations,
			...userFields,
		],
	};

	methods = {
		listSearch: {
			getUsers,
		},
	};
}
