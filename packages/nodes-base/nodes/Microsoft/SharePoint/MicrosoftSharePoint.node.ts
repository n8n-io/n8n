import type { INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { file, item, list } from './descriptions';
import { listSearch, resourceMapping } from './methods';

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
		subtitle: '={{ $parameter["operation"] + ": " + $parameter["resource"] }}',
		description: 'Interact with Microsoft SharePoint API',
		defaults: {
			name: 'Microsoft SharePoint',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'microsoftSharePointOAuth2Api',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: '=https://{{ $credentials.subdomain }}.sharepoint.com/_api/v2.0/',
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
		listSearch,
		resourceMapping,
	};
}
