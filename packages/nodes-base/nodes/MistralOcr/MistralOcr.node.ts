import type { INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { mistralOcrOperations, mistralOcrFields } from './descriptions/MistralOcrDescription';

export class MistralOcr implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Mistral OCR',
		name: 'mistralOcr',
		icon: {
			light: 'file:mistralOcr.svg',
			dark: 'file:mistralOcr.dark.svg',
		},
		group: ['transform'],
		version: 1,
		subtitle: '={{ $parameter["operation"] + ": " + $parameter["resource"] }}',
		description: 'Extract text and layout information from documents using Mistral’s OCR API.',
		defaults: {
			name: 'Mistral OCR',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [
			{
				name: 'mistralOcrApi',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: '={{ $credentials.baseUrl }}',
			ignoreHttpStatusErrors: true,
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Document',
						value: 'document',
					},
				],
				default: 'document',
			},
			...mistralOcrOperations,
			...mistralOcrFields,
		],
	};
}
