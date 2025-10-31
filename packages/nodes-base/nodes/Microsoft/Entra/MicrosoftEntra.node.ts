import type {
	ILoadOptionsFunctions,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { groupFields, groupOperations, userFields, userOperations } from './descriptions';
import { getGroupProperties, getGroups, getUserProperties, getUsers } from './GenericFunctions';

export class MicrosoftEntra implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Microsoft Entra ID',
		name: 'microsoftEntra',
		icon: {
			light: 'file:microsoftEntra.svg',
			dark: 'file:microsoftEntra.dark.svg',
		},
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with Microsoft Entra ID API',
		defaults: {
			name: 'Microsoft Entra ID',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'microsoftEntraOAuth2Api',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: 'https://graph.microsoft.com/v1.0',
			headers: {
				'Content-Type': 'application/json',
			},
		},
		properties: [
			{
				displayName: 'Microsoft Graph API Base URL',
				name: 'graphApiBaseUrl',
				type: 'options',
				options: [
					{ name: 'Global (https://graph.microsoft.com)', value: 'https://graph.microsoft.com' },
					{
						name: 'US Government (https://graph.microsoft.us)',
						value: 'https://graph.microsoft.us',
					},
					{
						name: 'US Government DOD (https://dod-graph.microsoft.us)',
						value: 'https://dod-graph.microsoft.us',
					},
					{
						name: 'China (https://microsoftgraph.chinacloudapi.cn)',
						value: 'https://microsoftgraph.chinacloudapi.cn',
					},
				],
				default: 'https://graph.microsoft.com',
				description: 'Select the endpoint for your Microsoft cloud environment.',
			},
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Group',
						value: 'group',
					},
					{
						name: 'User',
						value: 'user',
					},
				],
				default: 'user',
			},

			...groupOperations,
			...groupFields,
			...userOperations,
			...userFields,
		],
	};

	methods = {
		loadOptions: {
			getGroupProperties,

			async getGroupPropertiesGetAll(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				// Filter items not supported for list endpoint
				return (await getGroupProperties.call(this)).filter(
					(x) =>
						![
							'allowExternalSenders',
							'autoSubscribeNewMembers',
							'hideFromAddressLists',
							'hideFromOutlookClients',
							'isSubscribedByMail',
							'unseenCount',
						].includes(x.value as string),
				);
			},

			getUserProperties,

			async getUserPropertiesGetAll(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				// Filter items not supported for list endpoint
				return (await getUserProperties.call(this)).filter(
					(x) =>
						![
							'aboutMe',
							'birthday',
							'hireDate',
							'interests',
							'mySite',
							'pastProjects',
							'preferredName',
							'responsibilities',
							'schools',
							'skills',
							'mailboxSettings',
						].includes(x.value as string),
				);
			},
		},

		listSearch: {
			getGroups,

			getUsers,
		},
	};
}
