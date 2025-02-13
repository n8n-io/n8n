import type { INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionType } from 'n8n-workflow';

import {
	fileFields,
	fileOperations,
	itemFields,
	itemOperations,
	listFields,
	listOperations,
} from './descriptions';

export class MicrosoftSharePoint implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Microsoft SharePoint',
		name: 'microsoftSharePoint',
		icon: {
			light: 'file:icons/SharePoint.svg',
			dark: 'file:icons/SharePoint.svg',
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

			...fileOperations,
			...fileFields,
			...itemOperations,
			...itemFields,
			...listOperations,
			...listFields,
		],
	};

	methods = {
		loadOptions: {},

		listSearch: {},
	};
}
