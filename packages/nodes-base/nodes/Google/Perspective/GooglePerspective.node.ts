import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import {
	AttributesValuesUi,
	CommentAnalyzeBody,
	Language,
	RequestedAttributes,
} from './types';

import {
	googleApiRequest,
} from './GenericFunctions';

export class GooglePerspective implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Google Perspective',
		name: 'googlePerspective',
		icon: 'file:perspective.svg',
		group: [
			'transform',
		],
		version: 1,
		description: 'Consume Google Perspective API',
		subtitle: '={{$parameter["operation"]}}',
		defaults: {
			name: 'Google Perspective',
			color: '#200647',
		},
		inputs: [
			'main',
		],
		outputs: [
			'main',
		],
		credentials: [
			{
				name: 'googlePerspectiveOAuth2Api',
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
						name: 'Comment',
						value: 'comment',
					},
				],
				default: 'comment',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'comment',
						],
					},
				},
				options: [
					{
						name: 'Analyze',
						value: 'analyze',
					},
				],
				default: 'analyze',
			},
			{
				displayName: 'Text',
				name: 'text',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'analyze',
						],
					},
				},
			},
			{
				displayName: 'Attributes to Analyze',
				name: 'requestedAttributesUi',
				type: 'fixedCollection',
				default: '',
				typeOptions: {
					multipleValues: true,
				},
				placeholder: 'Add Atrribute',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'analyze',
						],
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
								description: 'Attribute to analyze in the text',
								default: 'flirtation',
							},
							{
								displayName: 'Score Threshold',
								name: 'scoreThreshold',
								type: 'number',
								typeOptions: {
									numberStepSize: 0.1,
									numberPrecision: 2,
									minValue: 0,
									maxValue: 1,
								},
								description: 'Score above which to return results. At zero, all scores are returned.',
								default: 0,
							},
						],
					},
				],
			},
			{
				displayName: 'Additional Options',
				name: 'additionalOptions',
				type: 'collection',
				displayOptions: {
					show: {
						operation: [
							'analyze',
						],
					},
				},
				default: {},
				placeholder: 'Add Option',
				options: [
					{
						displayName: 'Languages',
						name: 'languages',
						type: 'multiOptions',
						options: [
							{
								name: 'Arabic',
								value: 'ar',
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
								name: 'Italian',
								value: 'it',
							},
							{
								name: 'Portuguese',
								value: 'pt',
							},
							{
								name: 'Russian',
								value: 'ru',
							},
							{
								name: 'Spanish',
								value: 'es',
							},
						],
						default: [],
						description: 'Languages of the text input per ISO 631-1',
						required: true,
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const resource = this.getNodeParameter('resource', 0) as 'comment';
		const operation = this.getNodeParameter('operation', 0) as 'analyze';

		const returnData: IDataObject[] = [];
		let responseData;

		for (let i = 0; i < items.length; i++) {

			try {

				if (resource === 'comment') {

					if (operation === 'analyze') {

						// https://developers.perspectiveapi.com/s/about-the-api-methods

						const attributes = this.getNodeParameter(
							'requestedAttributesUi.requestedAttributesValues', i, [],
						) as AttributesValuesUi[];

						if (!attributes.length) {
							throw new NodeOperationError(
								this.getNode(),
								'Please enter at least one attribute to analyze.',
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

						const { languages } = this.getNodeParameter('additionalOptions', i) as { languages: Language };

						if (languages?.length) {
							body.languages = languages;
						}

						responseData = await googleApiRequest.call(this, 'POST', '/v1alpha1/comments:analyze', body);
					}
				}

			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: error.message });
					continue;
				}
				throw error;
			}

			Array.isArray(responseData)
				? returnData.push(...responseData)
				: returnData.push(responseData);

		}

		return [this.helpers.returnJsonArray(responseData)];
	}
}
