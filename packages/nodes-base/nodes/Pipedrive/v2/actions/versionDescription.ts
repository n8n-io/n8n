/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import { NodeConnectionTypes, type INodeTypeDescription } from 'n8n-workflow';

import * as activity from './activity';
import * as deal from './deal';
import * as dealProduct from './dealProduct';
import * as file from './file';
import * as lead from './lead';
import * as note from './note';
import * as organization from './organization';
import * as person from './person';
import * as product from './product';

export const versionDescription: INodeTypeDescription = {
	displayName: 'Pipedrive',
	name: 'pipedrive',
	icon: 'file:pipedrive.svg',
	group: ['transform'],
	version: 2,
	subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
	description: 'Create and edit data in Pipedrive',
	defaults: {
		name: 'Pipedrive',
	},
	inputs: [NodeConnectionTypes.Main],
	outputs: [NodeConnectionTypes.Main],
	credentials: [
		{
			name: 'pipedriveApi',
			required: true,
			displayOptions: {
				show: {
					authentication: ['apiToken'],
				},
			},
			testedBy: {
				request: {
					method: 'GET',
					url: '/users/me',
				},
			},
		},
		{
			name: 'pipedriveOAuth2Api',
			required: true,
			displayOptions: {
				show: {
					authentication: ['oAuth2'],
				},
			},
		},
	],
	// baseURL is v1 because it's only used by the credential testedBy request (GET /users/me)
	// which has no v2 equivalent. All v2 operations construct their own URLs via the transport layer.
	requestDefaults: {
		baseURL: 'https://api.pipedrive.com/v1',
		url: '',
	},
	properties: [
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'options',
			options: [
				{
					name: 'API Token',
					value: 'apiToken',
				},
				{
					name: 'OAuth2',
					value: 'oAuth2',
				},
			],
			default: 'apiToken',
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
					name: 'Deal',
					value: 'deal',
				},
				{
					name: 'Deal Product',
					value: 'dealProduct',
				},
				{
					name: 'File',
					value: 'file',
				},
				{
					name: 'Lead',
					value: 'lead',
				},
				{
					name: 'Note',
					value: 'note',
				},
				{
					name: 'Organization',
					value: 'organization',
				},
				{
					name: 'Person',
					value: 'person',
				},
				{
					name: 'Product',
					value: 'product',
				},
			],
			default: 'deal',
		},

		...activity.description,
		...deal.description,
		...dealProduct.description,
		...file.description,
		...lead.description,
		...note.description,
		...organization.description,
		...person.description,
		...product.description,
	],
};
