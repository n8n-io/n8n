import { IExecuteFunctions } from 'n8n-core';

import { IDataObject, INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow';

import { IData } from './Interface';

import { googleApiRequest } from './GenericFunctions';

export class GoogleCloudNaturalLanguage implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Google Cloud Natural Language',
		name: 'googleCloudNaturalLanguage',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
		icon: 'file:googlecloudnaturallanguage.png',
		group: ['input', 'output'],
		version: 1,
		description: 'Consume Google Cloud Natural Language API',
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		defaults: {
			name: 'Google Cloud Natural Language',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'googleCloudNaturalLanguageOAuth2Api',
				required: true,
			},
		],
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
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['document'],
					},
				},
				options: [
					{
						name: 'Analyze Sentiment',
						value: 'analyzeSentiment',
						action: 'Analyze sentiment',
					},
				],
				default: 'analyzeSentiment',
			},
			// ----------------------------------
			//         All
			// ----------------------------------
			{
				displayName: 'Source',
				name: 'source',
				type: 'options',
				options: [
					{
						name: 'Content',
						value: 'content',
					},
					{
						name: 'Google Cloud Storage URI',
						value: 'gcsContentUri',
					},
				],
				default: 'content',
				description:
					'The source of the document: a string containing the content or a Google Cloud Storage URI',
				required: true,
				displayOptions: {
					show: {
						operation: ['analyzeSentiment'],
					},
				},
			},
			{
				displayName: 'Content',
				name: 'content',
				type: 'string',
				default: '',
				description:
					'The content of the input in string format. Cloud audit logging exempt since it is based on user data.',
				required: true,
				displayOptions: {
					show: {
						operation: ['analyzeSentiment'],
						source: ['content'],
					},
				},
			},
			{
				displayName: 'Google Cloud Storage URI',
				name: 'gcsContentUri',
				type: 'string',
				default: '',
				description:
					'The Google Cloud Storage URI where the file content is located. This URI must be of the form: <code>gs://bucket_name/object_name</code>. For more details, see <a href="https://cloud.google.com/storage/docs/reference-uris.">reference</a>.',
				required: true,
				displayOptions: {
					show: {
						operation: ['analyzeSentiment'],
						source: ['gcsContentUri'],
					},
				},
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				displayOptions: {
					show: {
						operation: ['analyzeSentiment'],
					},
				},
				default: {},
				placeholder: 'Add Option',
				options: [
					{
						displayName: 'Document Type',
						name: 'documentType',
						type: 'options',
						options: [
							{
								name: 'HTML',
								value: 'HTML',
							},
							{
								name: 'Plain Text',
								value: 'PLAIN_TEXT',
							},
						],
						default: 'PLAIN_TEXT',
						description: 'The type of input document',
					},
					{
						displayName: 'Encoding Type',
						name: 'encodingType',
						type: 'options',
						options: [
							{
								name: 'None',
								value: 'NONE',
							},
							{
								name: 'UTF-8',
								value: 'UTF8',
							},
							{
								name: 'UTF-16',
								value: 'UTF16',
							},
							{
								name: 'UTF-32',
								value: 'UTF32',
							},
						],
						default: 'UTF16',
						description: 'The encoding type used by the API to calculate sentence offsets',
					},
					{
						displayName: 'Language',
						name: 'language',
						type: 'options',
						options: [
							{
								name: 'Arabic',
								value: 'ar',
							},
							{
								name: 'Chinese (Simplified)',
								value: 'zh',
							},
							{
								name: 'Chinese (Traditional)',
								value: 'zh-Hant',
							},
							{
								name: 'Dutch',
								value: 'nl',
							},
							{
								name: 'English',
								value: 'en',
							},
							{
								name: 'French',
								value: 'fr',
							},
							{
								name: 'German',
								value: 'de',
							},
							{
								name: 'Indonesian',
								value: 'id',
							},
							{
								name: 'Italian',
								value: 'it',
							},
							{
								name: 'Japanese',
								value: 'ja',
							},
							{
								name: 'Korean',
								value: 'ko',
							},
							{
								name: 'Portuguese (Brazilian & Continental)',
								value: 'pt',
							},
							{
								name: 'Spanish',
								value: 'es',
							},
							{
								name: 'Thai',
								value: 'th',
							},
							{
								name: 'Turkish',
								value: 'tr',
							},
							{
								name: 'Vietnamese',
								value: 'vi',
							},
						],
						default: 'en',
						placeholder: '',
						description:
							'The language of the document (if not specified, the language is automatically detected). Both ISO and BCP-47 language codes are accepted.',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const length = items.length;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		const responseData = [];
		for (let i = 0; i < length; i++) {
			if (resource === 'document') {
				if (operation === 'analyzeSentiment') {
					const source = this.getNodeParameter('source', i) as string;
					const options = this.getNodeParameter('options', i);
					const encodingType = (options.encodingType as string | undefined) || 'UTF16';
					const documentType = (options.documentType as string | undefined) || 'PLAIN_TEXT';

					const body: IData = {
						document: {
							type: documentType,
						},
						encodingType,
					};

					if (source === 'content') {
						const content = this.getNodeParameter('content', i) as string;
						body.document.content = content;
					} else {
						const gcsContentUri = this.getNodeParameter('gcsContentUri', i) as string;
						body.document.gcsContentUri = gcsContentUri;
					}

					if (options.language) {
						body.document.language = options.language as string;
					}

					const response = await googleApiRequest.call(
						this,
						'POST',
						`/v1/documents:analyzeSentiment`,
						body,
					);
					responseData.push(response);
				}
			}
		}
		return [this.helpers.returnJsonArray(responseData)];
	}
}
