import {
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
	type IPollFunctions,
	NodeConnectionTypes,
} from 'n8n-workflow';

import { getDrives } from './drive';
import { getSites, SITE_ID_REGEX } from './site';
import { SERVICE_PRINCIPAL_AUTH } from './transport';

const GUID = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';
// Rejects a bare GUID, which is a list ID: the one value likely to land in this
// field by mistake. Nothing further is asserted about a drive ID, because
// rejecting a legitimate one is the worse failure.
const DRIVE_ID_REGEX = `^(?!${GUID}$)\\S+$`;

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
			{
				displayName: 'Site',
				name: 'site',
				type: 'resourceLocator',
				required: true,
				default: { mode: 'list', value: '' },
				description: 'The SharePoint site holding the library to watch',
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						typeOptions: { searchListMethod: 'getSites', searchable: true },
					},
					{
						displayName: 'By URL',
						name: 'url',
						type: 'string',
						placeholder: 'e.g. https://contoso.sharepoint.com/sites/mysite',
						validation: [
							{
								type: 'regex',
								properties: {
									regex: '^https://.+',
									errorMessage: 'The URL must start with https://',
								},
							},
						],
					},
					{
						displayName: 'By ID',
						name: 'id',
						type: 'string',
						placeholder: 'e.g. contoso.sharepoint.com,5a58bb09-…,9f0d…',
						validation: [
							{
								type: 'regex',
								properties: {
									regex: SITE_ID_REGEX,
									errorMessage:
										'Use the ID from the site picker or Graph (hostname,GUID,GUID), a site GUID, a hostname, or "root". For a site address, switch the field to URL mode.',
								},
							},
						],
					},
				],
			},
			{
				displayName: 'Document Library',
				name: 'drive',
				type: 'resourceLocator',
				required: true,
				default: { mode: 'list', value: '' },
				description: 'The document library to watch for changes',
				displayOptions: { hide: { site: [''] } },
				typeOptions: { loadOptionsDependsOn: ['site.value'] },
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						typeOptions: { searchListMethod: 'getDrives', searchable: true },
					},
					{
						displayName: 'By ID',
						name: 'id',
						type: 'string',
						placeholder: 'e.g. b!zXyF9k…',
						validation: [
							{
								type: 'regex',
								properties: {
									regex: DRIVE_ID_REGEX,
									errorMessage:
										"That looks like a list ID. This field needs the library's drive ID, which the picker supplies.",
								},
							},
						],
					},
				],
			},
		],
	};

	methods = {
		listSearch: { getSites, getDrives },
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		return null;
	}
}
