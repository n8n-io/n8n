import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

import { imageFields, imageOperations } from './ImageDescription';

export class ModelsLab implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'ModelsLab',
		name: 'modelsLab',
		icon: 'file:modelslab.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Generate and edit images using ModelsLab AI models including Flux, Stable Diffusion, and professional tools',
		defaults: {
			name: 'ModelsLab',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'modelsLabApi',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: 'https://modelslab.com/api/v6',
			headers: {
				Accept: 'application/json',
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
						name: 'Image',
						value: 'image',
					},
				],
				default: 'image',
			},
			...imageOperations,
			...imageFields,
		],
	};
}