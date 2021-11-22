import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	oneSaasRequest,
} from './GenericFunctions';

export class OneSaas implements INodeType {
	description: INodeTypeDescription = {
		displayName: '1 SaaS',
		name: 'oneSaas',
		icon: 'file:oneSaas.svg',
		group: ['transform'],
		version: 1,
		description: 'A toolbox of no-code utilities',
		defaults: {
			name: '1 SaaS',
			color: '#1A82e2',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'oneSaas',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'AI',
						value: 'ai',
					},
					{
						name: 'Code',
						value: 'code',
					},
					{
						name: 'File',
						value: 'file',
					},
					{
						name: 'NoCode Helper',
						value: 'noCodeHelper',
					},
					{
						name: 'Random',
						value: 'random',
					},
				],
				default: 'ai',
				required: true,
			},
			// AI
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'ai',
						],
					},
				},
				options: [
					{
						name: 'OCR',
						value: 'ocr',
						description: 'Generate a PDF from a webpage',
					},
					{
						name: 'Picture Recognition',
						value: 'pictureRecognition',
						description: 'Get SEO information from website',
					},
					{
						name: 'Entity Detection',
						value: 'entityDetection',
						description: 'Create a screenshot from a webpage',
					},
					{
						name: 'Mood Detection',
						value: 'moodDetection',
						description: 'Create a screenshot from a webpage',
					},
					{
						name: 'Email Validation',
						value: 'emailValidation',
						description: 'Create a screenshot from a webpage',
					},
					{
						name: 'Translation',
						value: 'translation',
						description: 'Create a screenshot from a webpage',
					},
					{
						name: 'Language Validation',
						value: 'languageValidation',
						description: 'Create a screenshot from a webpage',
					},
				],
				default: 'ocr',
			},
			// Code
			// File
			// NoCode Helper
			// Random
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		// Not Yet Implemented
	}

}
