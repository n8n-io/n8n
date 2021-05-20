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
	FloatValue,
	IData,
	RequestedAttributes,
} from './Interface';

import {
	googleApiRequest,
} from './GenericFunctions';
import { stringify } from 'lossless-json';

export class GooglePerspective implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Google Perspective',
		name: 'googlePerspective',
		icon: 'file:perspective.png',
		group: ['input', 'output'],
		version: 1,
		description: 'Consume Google Perspective API',
		subtitle:
			'={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		defaults: {
			name: 'Google Perspective',
			color: '#200647'
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'googlePerspectiveOAuth2Api',
				required: true
			}
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'comment',
						value: 'comment'
					}
				],
				default: 'comment',
				description: 'The resource to operate on.'
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['comment']
					}
				},
				options: [
					{
						name: 'Analyze Comment',
						value: 'AnalyzeComment',
						description: 'Analyze Comment'
					}
				],
				default: 'AnalyzeComment',
				description: 'The operation to perform'
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
						name: 'text',
						value: 'text'
					}
				],
				default: 'text',
				description: 'The source of the comment.',
				required: true,
				displayOptions: {
					show: {
						operation: ['AnalyzeComment']
					}
				}
			},
			{
				displayName: 'Text',
				name: 'text',
				type: 'string',
				default: '',
				description: 'The text of the input in string format.',
				required: true,
				displayOptions: {
					show: {
						operation: ['AnalyzeComment'],
						source: ['text']
					}
				}
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				displayOptions: {
					show: {
						operation: ['AnalyzeComment']
					}
				},
				default: {},
				description: '',
				placeholder: 'Add Option',
				options: [
					{
						displayName: 'Requested Attributes',
						name: 'requestedAttributesUi',
						type: 'fixedCollection',
						default: '',
						typeOptions: {
							multipleValues: true,
						},
						placeholder: 'Add Requested Atrribute',
						options: [
							{
								name: 'requestedAttributesValues',
								displayName: 'Requested Attribute',
								values: [
									{
										displayName: 'Attribute Name',
										name: 'attributeName',
										type: 'options',
										options: [
											{
												name: 'Toxicity',
												value: 'toxicity',
											},
											{
												name: 'Severe Toxicity',
												value: 'severe_toxicity',
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
												name: 'Threat',
												value: 'threat',
											},
											{
												name: 'Sexually Explicit',
												value: 'sexually_explicit',
											},
											{
												name: 'Flirtation',
												value: 'flirtation',
											},
										],
										description: 'Attributes to analyze in the text. You can specify multiple attribute names here to get scores from multiple attributes in a single request.',
										default: '',
									},
									{
										displayName: 'Score Type',
										name: 'scoreType',
										type: 'options',
										options: [
											{
												name: 'Probability',
												value: 'probability',
											},
										],
										description: 'Probability score for the attribute, in the range [0,1].',
										default: '',
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
										description: 'The API won\'t return scores that are below this threshold for this attribute. By default, all scores are returned.',
										default: 0,
									},
								],
							},
						],
					},
					{
						displayName: 'Comment Type',
						name: 'commentType',
						type: 'options',
						options: [
							{
								name: 'Plain Text',
								value: 'PLAIN_TEXT'
							}
						],
						default: 'PLAIN_TEXT',
						description: 'The type of input comment.',
						required: true
					},
					{
						displayName: 'Language',
						name: 'language',
						type: 'options',
						options: [
							{
								name: 'English',
								value: 'en'
							},
							{
								name: 'French',
								value: 'fr'
							},
							{
								name: 'German',
								value: 'de'
							}
						],
						default: 'en',
						description: 'The language of input comment.',
						required: true
					}
				]
			}
		]
	};

	async execute(
		this: IExecuteFunctions
	): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const length = (items.length as unknown) as number;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		const responseData = [];
		for (let i = 0; i < length; i++) {
			if (resource === 'comment') {
				if (operation === 'AnalyzeComment') {
					const source = this.getNodeParameter('source', i) as string;
					const options = this.getNodeParameter(
						'options',
						i
					) as IDataObject;
					const commentType =
						(options.commentType as string | undefined) || 'PLAIN_TEXT';
					let attributes = this.getNodeParameter(
						'options.requestedAttributesUi.requestedAttributesValues',
						i, []
					) as IDataObject[];

					const data = attributes.reduce((accumulator: { [key: string]: any }, currentValue: IDataObject) => {
						return Object.assign(accumulator, {
						[`${(currentValue.attributeName as string).toUpperCase()}`]: {
							'scoreType': currentValue.scoreType,
							'scoreThreshold': currentValue.scoreThreshold,
						} });
					}, {});

					const body: IData = {
						comment: {
							type: commentType
						},
						requestedAttributes: (data as unknown) as RequestedAttributes
					};

					if (source === 'text') {
						const text = this.getNodeParameter('text', i) as string;
						body.comment.text = text;
					}

					if (options.language) {
						body.languages = options.language as string;
					}

					const response = await googleApiRequest.call(
						this,
						'POST',
						`/v1alpha1/comments:analyze`,
						body
					);
					responseData.push(response);
				}
			}
		}
		return [this.helpers.returnJsonArray(responseData)];
	}
}
