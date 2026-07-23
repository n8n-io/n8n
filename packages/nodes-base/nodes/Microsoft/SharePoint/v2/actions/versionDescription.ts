/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import type { INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import * as file from './file';
import * as item from './item';
import * as list from './list';
import { SERVICE_PRINCIPAL_AUTH } from '../transport';

export const versionDescription: INodeTypeDescription = {
	displayName: 'Microsoft SharePoint',
	name: 'microsoftSharePoint',
	icon: {
		light: 'file:microsoftSharePoint.svg',
		dark: 'file:microsoftSharePoint.svg',
	},
	group: ['transform'],
	version: 2,
	subtitle: '={{ $parameter["operation"] + ": " + $parameter["resource"] }}',
	description: 'Interact with Microsoft SharePoint API',
	defaults: {
		name: 'Microsoft SharePoint',
	},
	inputs: [NodeConnectionTypes.Main],
	outputs: [NodeConnectionTypes.Main],
	// The v1 credential (microsoftSharePointOAuth2Api) is deliberately not
	// offered: its tokens target the legacy {subdomain}.sharepoint.com/_api
	// host and fail against Graph.
	credentials: [
		{
			name: 'microsoftOAuth2Api',
			required: true,
			displayOptions: {
				show: {
					authentication: ['microsoftOAuth2Api'],
				},
			},
		},
		{
			name: SERVICE_PRINCIPAL_AUTH,
			required: true,
			displayOptions: {
				show: {
					authentication: [SERVICE_PRINCIPAL_AUTH],
				},
			},
		},
	],
	properties: [
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'options',
			noDataExpression: true,
			options: [
				{
					name: 'Microsoft OAuth2 (Graph)',
					value: 'microsoftOAuth2Api',
					description:
						'Generic Microsoft Graph credential. Enable the scopes this node needs (e.g. Sites.ReadWrite.All) on the credential.',
				},
				{
					name: 'Microsoft Entra Service Principal (App-Only)',
					value: SERVICE_PRINCIPAL_AUTH,
					description:
						'App-only access via a Microsoft Entra app registration with admin-consented SharePoint application permissions',
				},
			],
			default: 'microsoftOAuth2Api',
		},
		{
			displayName: 'Resource',
			name: 'resource',
			type: 'options',
			noDataExpression: true,
			options: [
				{
					name: 'File',
					value: 'file',
				},
				{
					name: 'Item',
					value: 'item',
				},
				{
					name: 'List',
					value: 'list',
				},
			],
			default: 'list',
		},

		...file.description,
		...item.description,
		...list.description,
	],
};
