
import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	googleApiRequest,
} from './GenericFunctions';

export interface IGoogleAuthCredentials {
	email: string;
	privateKey: string;
}

export class GoogleTranslate implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Google Translate',
		name: 'googleTranslate',
		icon: 'file:googletranslate.png',
		group: ['input', 'output'],
		version: 1,
		description: 'Translate data using Google Translate',
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		defaults: {
			name: 'Google Translate',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'googleApi',
				required: true,
				displayOptions: {
					show: {
						authentication: [
							'serviceAccount',
						],
					},
				},
			},
			{
				name: 'googleTranslateOAuth2Api',
				required: true,
				displayOptions: {
					show: {
						authentication: [
							'oAuth2',
						],
					},
				},
			},
		],
		properties: [
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				options: [
					{
						name: 'Service Account',
						value: 'serviceAccount',
					},
					{
						name: 'OAuth2',
						value: 'oAuth2',
					},
				],
				default: 'serviceAccount',
			},
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Language',
						value: 'language',
					},
				],
				default: 'language',
				description: 'The operation to perform',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'language',
						],
					},
				},
				options: [
					{
						name: 'Translate',
						value: 'translate',
						description: 'Translate data',
					},
				],
				default: 'translate',
				description: 'The operation to perform',
			},
			// ----------------------------------
			//         All
			// ----------------------------------
			{
				displayName: 'Text',
				name: 'text',
				type: 'string',
				default: '',
				description: 'The input text to translate',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'translate',
						],
					},
				},
			},
			{
				displayName: 'Translate To',
				name: 'translateTo',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getLanguages',
				},
				default: '',
				description: 'The language to use for translation of the input text, set to one of the language codes listed in <a href="https://cloud.google.com/translate/docs/languages">Language Support</a>',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'translate',
						],
					},
				},
			},
		],
	};

	methods = {
		loadOptions: {
			async getLanguages(
				this: ILoadOptionsFunctions,
			): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const { data: { languages } } = await googleApiRequest.call(
					this,
					'GET',
					'/language/translate/v2/languages',
				);
				for (const language of languages) {
					returnData.push({
						name: language.language.toUpperCase(),
						value: language.language,
					});
				}
				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const length = items.length as unknown as number;

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		const responseData = [];
		for (let i = 0; i < length; i++) {
			if (resource === 'language') {
				if (operation === 'translate') {
					const text = this.getNodeParameter('text', i) as string;
					const translateTo = this.getNodeParameter('translateTo', i) as string;

					const response = await googleApiRequest.call(this, 'POST', `/language/translate/v2`, { q: text, target: translateTo });
					responseData.push(response.data.translations[0]);
				}
			}
		}
		return [this.helpers.returnJsonArray(responseData)];
	}
}
