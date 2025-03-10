import type { INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionType } from 'n8n-workflow';

import { file, item, list } from './descriptions';
import { getItems, getLists, getSites } from './methods/listSearch';

export class MicrosoftSharePoint implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Microsoft SharePoint',
		name: 'microsoftSharePoint',
		icon: {
			light: 'file:microsoftSharePoint.svg',
			dark: 'file:microsoftSharePoint.svg',
		},
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with Microsoft SharePoint API',
		defaults: {
			name: 'Microsoft SharePoint',
		},
		usableAsTool: true,
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		credentials: [
			{
				name: 'microsoftSharePointOAuth2Api',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: '=https://{{ $credentials.subdomain }}.sharepoint.com/_api/v2.0/',
			headers: {
				'Content-Type': 'application/json',
			},
		},
		properties: [
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
				default: 'file',
			},

			...file.description,
			...item.description,
			...list.description,
		],
	};

	methods = {
		listSearch: {
			getItems,
			getLists,
			getSites,
		},
	};
}
