import type { INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { chatFields, chatOperations } from './descriptions';
import { oldVersionNotice } from '../../utils/descriptions';

export class GigaChat implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'GigaChat',
		name: 'gigaChat',
		icon: {
			light: 'file:ac21ee8f_GC-api-black-green-sphere.svg',
			dark: 'file:ac21ee8f_GC-api-black-green-sphere.svg',
		},
		group: ['transform'],
		version: [1],
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume GigaChat API',
		defaults: {
			name: 'GigaChat',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'gigaChatApi',
				required: true,
			},
		],
		requestDefaults: {
			ignoreHttpStatusErrors: true,
			baseURL: '={{ $credentials.apiUrl ?? "https://gigachat.devices.sberbank.ru/api/v1" }}',
			skipSslCertificateValidation: '={{ $credentials.allowUnauthorizedCerts }}',
		},
		properties: [
			oldVersionNotice,
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Chat',
						value: 'chat',
					},
				],
				default: 'chat',
			},

			...chatOperations,
			...chatFields,
		],
	};
}
