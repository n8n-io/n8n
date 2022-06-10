import {
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { contactFields, contactOperations } from './description/ContactDescription';

export class HighLevel implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'HighLevel',
		name: 'highLevel',
		icon: 'file:highLevel.svg',
		group: ['transform'],
		version: 1,
		description: 'Consume HighLevel API',
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		defaults: {
			name: 'HighLevel',
			color: '#f1be40',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'highLevelApi',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: 'https://rest.gohighlevel.com/v1',
			headers: {
				'Accept': 'application/json',
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
						name: 'Contact',
						value: 'contact',
					},
				],
				default: 'contact',
				required: true,
			},
			...contactOperations,
			...contactFields,
		],
	};
}
