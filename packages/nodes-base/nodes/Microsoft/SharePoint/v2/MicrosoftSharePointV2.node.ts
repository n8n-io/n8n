import type { INodeType, INodeTypeBaseDescription, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

// Graph-based v2 rebuild in progress; actions, transport, and pickers arrive
// in follow-up tickets. Not registered yet — uncomment the registration in
// MicrosoftSharePoint.node.ts to test locally.
export const versionDescription: INodeTypeDescription = {
	displayName: 'Microsoft SharePoint',
	name: 'microsoftSharePoint',
	icon: {
		light: 'file:microsoftSharePoint.svg',
		dark: 'file:microsoftSharePoint.svg',
	},
	group: ['transform'],
	version: 2,
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
			name: 'microsoftEntraServicePrincipalApi',
			required: true,
			displayOptions: {
				show: {
					authentication: ['microsoftEntraServicePrincipalApi'],
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
					value: 'microsoftEntraServicePrincipalApi',
					description:
						'App-only access via a Microsoft Entra app registration with admin-consented SharePoint application permissions',
				},
			],
			default: 'microsoftOAuth2Api',
		},
	],
};

export class MicrosoftSharePointV2 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			...versionDescription,
		};
	}
}
