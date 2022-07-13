import { IExecuteFunctions } from 'n8n-core';

import {
	IBinaryData,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import { mediaTypes, messageFields, messageTypeFields } from './MessagesDescription';
import { OptionsWithUri } from 'request';
import { mediaFields, mediaTypeFields } from './MediaDescription';

export class WhatsApp implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'WhatsApp',
		name: 'whatsApp',
		icon: 'file:whatsapp.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{ $parameter["resource"] + ": " + $parameter["operation"] }}',
		description: 'Access WhatsApp API',
		defaults: {
			name: 'WhatsApp',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'whatsAppApi',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: 'https://graph.facebook.com/v13.0/',
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Message',
						value: 'messages',
					},
					{
						name: 'Media',
						value: 'media',
					},
				],
				default: 'messages',
			},
			...messageFields,
			...messageTypeFields,
			...mediaFields,
			...mediaTypeFields,
		],
	};
}
