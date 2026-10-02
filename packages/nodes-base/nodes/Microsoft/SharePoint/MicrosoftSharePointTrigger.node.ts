import {
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
	type IPollFunctions,
	NodeConnectionTypes,
} from 'n8n-workflow';

import { SERVICE_PRINCIPAL_AUTH } from './transport';

export class MicrosoftSharePointTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Microsoft SharePoint Trigger',
		name: 'microsoftSharePointTrigger',
		icon: {
			light: 'file:microsoftSharePoint.svg',
			dark: 'file:microsoftSharePoint.svg',
		},
		group: ['trigger'],
		version: 1,
		description: 'Starts a workflow when a file or list item changes in Microsoft SharePoint',
		subtitle: '',
		defaults: {
			name: 'Microsoft SharePoint Trigger',
		},
		// The v1 credential (microsoftSharePointOAuth2Api) is not offered: its
		// tokens target the legacy {subdomain}.sharepoint.com/_api host and fail
		// against Graph.
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
		// Stays out of the node picker until the whole trigger is built. Note this
		// also labels the node "Deprecated" in the NDV until it is removed.
		hidden: true,
		polling: true,
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
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
							'Generic Microsoft Graph credential. Enable the scopes this trigger needs (e.g. Sites.Read.All) on the credential.',
					},
					{
						name: 'Microsoft Entra Service Principal (App-Only)',
						value: SERVICE_PRINCIPAL_AUTH,
						description:
							'App-only access via a Microsoft Entra app registration. Polling continues when no user is signed in.',
					},
				],
				default: 'microsoftOAuth2Api',
			},
		],
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		return null;
	}
}
