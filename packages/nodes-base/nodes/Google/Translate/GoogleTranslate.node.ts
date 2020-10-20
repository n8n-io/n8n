
import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	INodeExecutionData,
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
		icon: 'file:googletranslate.svg',
		group: ['input', 'output'],
		version: 1,
		description: 'Translate data using Google Translate',
		defaults: {
			name: 'Google Translate',
			color: '#5390f5',
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
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
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
				displayName: 'Query',
				name: 'query',
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
				type: 'string',
				default: '',
				description: 'The language to use for translation of the input text, set to one of the<br/> language codes listed in <a href="https://cloud.google.com/translate/docs/languages">Language Support</a>',
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


	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const length = items.length as unknown as number;

		const operation = this.getNodeParameter('operation', 0) as string;
		const responseData = [];

		for (let i=0; i < length; i++) {
			if (operation === 'translate') {
				const query = this.getNodeParameter('query', i) as string;
				const translateTo = this.getNodeParameter('translateTo', i) as string;

				const response = await googleApiRequest.call(this, 'POST', `/language/translate/v2`, {q:query, target:translateTo});
				responseData.push(response.data.translations[0]);
			}
		}
		return [this.helpers.returnJsonArray(responseData)];
	}
}
