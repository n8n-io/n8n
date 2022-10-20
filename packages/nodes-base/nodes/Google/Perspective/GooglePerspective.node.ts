import { IExecuteFunctions } from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import { AttributesValuesUi, CommentAnalyzeBody, Language, RequestedAttributes } from './types';

import { googleApiRequest } from './GenericFunctions';

const ISO6391 = require('iso-639-1');

export class GooglePerspective implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Google Perspective',
		name: 'googlePerspective',
		icon: 'file:perspective.svg',
		group: ['transform'],
		version: 1,
		description: 'Consume Google Perspective API',
		subtitle: '={{$parameter["operation"]}}',
		defaults: {
			name: 'Google Perspective',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'googlePerspectiveOAuth2Api',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Analyze Comment',
						value: 'analyzeComment',
					},
				],
				default: 'analyzeComment',
			},
			{
				displayName: 'Text',
				name: 'text',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['analyzeComment'],
					},
				},
			},
			{
				displayName: 'Attributes to Analyze',
				name: 'requestedAttributesUi',
				type: 'fixedCollection',
				default: {},
				typeOptions: {
					multipleValues: true,
				},
				placeholder: 'Add Atrribute',
				required: true,
				displayOptions: {
					show: {
						operation: ['analyzeComment'],
					},
				},
				options: [
					{
						displayName: 'Properties',
						name: 'requestedAttributesValues',
						values: [
							{
								displayName: 'Attribute Name',
								name: 'attributeName',
								type: 'options',
								options: [
									{
										name: 'Flirtation',
										value: 'flirtation',
									},
									{
										name: 'Identity Attack',
										value: 'identity_attack',
									},
									{
										name: 'Insult',
										value: 'insult',
									},
									{
										name: 'Profanity',
										value: 'profanity',
									},
									{
										name: 'Severe Toxicity',
										value: 'severe_toxicity',
									},
									{
										name: 'Sexually Explicit',
										value: 'sexually_explicit',
									},
									{
										name: 'Threat',
										value: 'threat',
									},
									{
										name: 'Toxicity',
										value: 'toxicity',
									},
								],
								description:
									'Attribute to analyze in the text. Details <a href="https://developers.perspectiveapi.com/s/about-the-api-attributes-and-languages">here</a>.',
								default: 'flirtation',
							},
							{
								displayName: 'Score Threshold',
								name: 'scoreThreshold',
								type: 'number',
								typeOptions: {
									numberPrecision: 2,
									minValue: 0,
									maxValue: 1,
								},
								description:
									'Score above which to return results. At zero, all scores are returned.',
								default: 0,
							},
						],
					},
				],
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				displayOptions: {
					show: {
						operation: ['analyzeComment'],
					},
				},
				default: {},
				placeholder: 'Add Option',
				options: [
					{
						displayName: 'Language Name or ID',
						name: 'languages',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getLanguages',
						},
						default: '',
						description:
							'Languages of the text input. If unspecified, the API will auto-detect the comment language. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
					},
				],
			},
		],
	};

	methods = {
		loadOptions: {
			// Get all the available languages to display them to user so that he can
			// select them easily
			async getLanguages(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const supportedLanguages = [
					'English',
					'Spanish',
					'French',
					'German',
					'Portuguese',
					'Italian',
					'Russian',
				];

				const languages = ISO6391.getAllNames().filter((language: string) =>
					supportedLanguages.includes(language),
				);
				for (const language of languages) {
					const languageName = language;
					const languageId = ISO6391.getCode(language);
					returnData.push({
						name: languageName,
						value: languageId,
					});
				}
				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const operation = this.getNodeParameter('operation', 0);

		const returnData: INodeExecutionData[] = [];
		let responseData;

		for (let i = 0; i < items.length; i++) {
			try {
				if (operation === 'analyzeComment') {
					// https://developers.perspectiveapi.com/s/about-the-api-methods

					const attributes = this.getNodeParameter(
						'requestedAttributesUi.requestedAttributesValues',
						i,
						[],
					) as AttributesValuesUi[];

					if (!attributes.length) {
						throw new NodeOperationError(
							this.getNode(),
							'Please enter at least one attribute to analyze.',
							{ itemIndex: i },
						);
					}

					const requestedAttributes = attributes.reduce<RequestedAttributes>((acc, cur) => {
						return Object.assign(acc, {
							[cur.attributeName.toUpperCase()]: {
								scoreType: 'probability',
								scoreThreshold: cur.scoreThreshold,
							},
						});
					}, {});

					const body: CommentAnalyzeBody = {
						comment: {
							type: 'PLAIN_TEXT',
							text: this.getNodeParameter('text', i) as string,
						},
						requestedAttributes,
					};

					const { languages } = this.getNodeParameter('options', i) as { languages: Language };

					if (languages?.length) {
						body.languages = languages;
					}

					responseData = await googleApiRequest.call(
						this,
						'POST',
						'/v1alpha1/comments:analyze',
						body,
					);
				}
			} catch (error) {
				if (this.continueOnFail()) {
					const executionErrorData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray({ error: error.message }),
						{ itemData: { item: i } },
					);
					returnData.push(...executionErrorData);
					continue;
				}
				throw error;
			}

			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(responseData),
				{ itemData: { item: i } },
			);

			returnData.push(...executionData);
		}

		return this.prepareOutputData(returnData);
	}
}
