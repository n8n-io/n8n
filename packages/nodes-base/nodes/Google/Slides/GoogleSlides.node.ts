import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	googleApiRequest,
} from './GenericFunctions';

export class GoogleSlides implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Google Slides',
		name: 'googleSlides',
		icon: 'file:googleslides.svg',
		group: ['input', 'output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume the Google Slides API',
		defaults: {
			name: 'Google Slides',
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
				name: 'googleSlidesOAuth2Api',
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
						name: 'OAuth2',
						value: 'oAuth2',
					},
					{
						name: 'Service Account',
						value: 'serviceAccount',
					},
				],
				default: 'serviceAccount',
			},
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Page',
						value: 'page',
					},
					{
						name: 'Presentation',
						value: 'presentation',
					},
				],
				default: 'presentation',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a presentation',
						action: 'Create a presentation',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get a presentation',
						action: 'Get a presentation',
					},
					{
						name: 'Get Slides',
						value: 'getSlides',
						description: 'Get presentation slides',
						action: 'Get slides from a presentation',
					},
					{
						name: 'Replace Text',
						value: 'replaceText',
						description: 'Replace text in a presentation',
						action: 'Replace text in a presentation',
					},
				],
				displayOptions: {
					show: {
						resource: [
							'presentation',
						],
					},
				},
				default: 'create',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Get a page',
						action: 'Get a page',
					},
					{
						name: 'Get Thumbnail',
						value: 'getThumbnail',
						description: 'Get a thumbnail',
						action: 'Get the thumbnail for a page',
					},
				],
				displayOptions: {
					show: {
						resource: [
							'page',
						],
					},
				},
				default: 'get',
			},
			{
				displayName: 'Title',
				name: 'title',
				description: 'Title of the presentation to create',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'presentation',
						],
						operation: [
							'create',
						],
					},
				},
			},
			{
				displayName: 'Presentation ID',
				name: 'presentationId',
				description: 'ID of the presentation to retrieve. Found in the presentation URL: <code>https://docs.google.com/presentation/d/PRESENTATION_ID/edit</code>',
				placeholder: '1wZtNFZ8MO-WKrxhYrOLMvyiqSgFwdSz5vn8_l_7eNqw',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'presentation',
							'page',
						],
						operation: [
							'get',
							'getThumbnail',
							'getSlides',
							'replaceText',
						],
					},
				},
			},
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				displayOptions: {
					show: {
						operation: [
							'getSlides',
						],
						resource: [
							'presentation',
						],
					},
				},
				default: false,
				description: 'Whether to return all results or only up to a given limit',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				displayOptions: {
					show: {
						operation: [
							'getSlides',
						],
						resource: [
							'presentation',
						],
						returnAll: [
							false,
						],
					},
				},
				typeOptions: {
					minValue: 1,
					maxValue: 500,
				},
				default: 100,
				description: 'Max number of results to return',
			},
			{
				displayName: 'Page Object ID',
				name: 'pageObjectId',
				description: 'ID of the page object to retrieve',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'page',
						],
						operation: [
							'get',
							'getThumbnail',
						],
					},
				},
			},
			{
				displayName: 'Texts To Replace',
				name: 'textUi',
				placeholder: 'Add Text',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				displayOptions: {
					show: {
						resource: [
							'presentation',
						],
						operation: [
							'replaceText',
						],
					},
				},
				default: {},
				options: [
					{
						name: 'textValues',
						displayName: 'Text',
						values: [
							{
								displayName: 'Match Case',
								name: 'matchCase',
								type: 'boolean',
								default: false,
								description: 'Whether the search should respect case. True : the search is case sensitive. False : the search is case insensitive.',
							},
							{
								displayName: 'Page Names or IDs',
								name: 'pageObjectIds',
								type: 'multiOptions',
								default: [],
								typeOptions: {
									loadOptionsMethod: 'getPages',
									loadOptionsDependsOn: [
										'presentationId',
									],
								},
								description: 'If non-empty, limits the matches to page elements only on the given pages. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
							},
							{
								displayName: 'Replace Text',
								name: 'replaceText',
								type: 'string',
								default: '',
								description: 'The text that will replace the matched text',
							},
							{
								displayName: 'Text',
								name: 'text',
								type: 'string',
								default: '',
								description: 'The text to search for in the shape or table',
							},
						],
					},
				],
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				displayOptions: {
					show: {
						operation: [
							'replaceText',
						],
						resource: [
							'presentation',
						],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Revision ID',
						name: 'revisionId',
						type: 'string',
						default: '',
						description: 'The revision ID of the presentation required for the write request. If specified and the requiredRevisionId doesn\'t exactly match the presentation\'s current revisionId, the request will not be processed and will return a 400 bad request error.',
					},
				],
			},

			{
				displayName: 'Download',
				name: 'download',
				type: 'boolean',
				default: false,
				displayOptions: {
					show: {
						resource: [
							'page',
						],
						operation: [
							'getThumbnail',
						],
					},
				},
				// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
				description: 'Name of the binary property to which to write the data of the read page',
			},
			{
				displayName: 'Binary Property',
				name: 'binaryProperty',
				type: 'string',
				required: true,
				default: 'data',
				description: 'Name of the binary property to which to write to',
				displayOptions: {
					show: {
						resource: [
							'page',
						],
						operation: [
							'getThumbnail',
						],
						download: [
							true,
						],
					},
				},
			},
		],
	};

	methods = {
		loadOptions: {
			// Get all the pages to display them to user so that he can
			// select them easily
			async getPages(
				this: ILoadOptionsFunctions,
			): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const presentationId = this.getCurrentNodeParameter('presentationId') as string;
				const { slides } = await googleApiRequest.call(this, 'GET', `/presentations/${presentationId}`, {}, { fields: 'slides' });
				for (const slide of slides) {
					returnData.push({
						name: slide.objectId,
						value: slide.objectId,
					});
				}
				return returnData;
			},
		},
	};


	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		let responseData;
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {

			try {

				if (resource === 'page') {

					// *********************************************************************
					//                              page
					// *********************************************************************

					if (operation === 'get') {

						// ----------------------------------
						//            page: get
						// ----------------------------------

						const presentationId = this.getNodeParameter('presentationId', i) as string;
						const pageObjectId = this.getNodeParameter('pageObjectId', i) as string;
						responseData = await googleApiRequest.call(this, 'GET', `/presentations/${presentationId}/pages/${pageObjectId}`);
						returnData.push({ json: responseData });

					} else if (operation === 'getThumbnail') {

						// ----------------------------------
						//         page: getThumbnail
						// ----------------------------------

						const presentationId = this.getNodeParameter('presentationId', i) as string;
						const pageObjectId = this.getNodeParameter('pageObjectId', i) as string;
						responseData = await googleApiRequest.call(this, 'GET', `/presentations/${presentationId}/pages/${pageObjectId}/thumbnail`);

						const download = this.getNodeParameter('download', 0) as boolean;
						if (download === true) {
							const binaryProperty = this.getNodeParameter('binaryProperty', i) as string;

							const data = await this.helpers.request({
								uri: responseData.contentUrl,
								method: 'GET',
								json: false,
								encoding: null,
							});

							const fileName = pageObjectId + '.png';
							const binaryData = await this.helpers.prepareBinaryData(data, fileName || fileName);
							returnData.push({
								json: responseData,
								binary: {
									[binaryProperty]: binaryData,
								},
							});
						} else {
							returnData.push({ json: responseData });
						}
					}

				} else if (resource === 'presentation') {

					// *********************************************************************
					//                           presentation
					// *********************************************************************

					if (operation === 'create') {

						// ----------------------------------
						//       presentation: create
						// ----------------------------------

						const body = {
							title: this.getNodeParameter('title', i) as string,
						};

						responseData = await googleApiRequest.call(this, 'POST', '/presentations', body);
						returnData.push({ json: responseData });

					} else if (operation === 'get') {

						// ----------------------------------
						//         presentation: get
						// ----------------------------------

						const presentationId = this.getNodeParameter('presentationId', i) as string;
						responseData = await googleApiRequest.call(this, 'GET', `/presentations/${presentationId}`);
						returnData.push({ json: responseData });

					} else if (operation === 'getSlides') {

						// ----------------------------------
						//      presentation: getSlides
						// ----------------------------------
						const returnAll = this.getNodeParameter('returnAll', 0) as boolean;
						const presentationId = this.getNodeParameter('presentationId', i) as string;
						responseData = await googleApiRequest.call(this, 'GET', `/presentations/${presentationId}`, {}, { fields: 'slides' });
						responseData = responseData.slides;
						if (returnAll === false) {
							const limit = this.getNodeParameter('limit', i) as number;
							responseData = responseData.slice(0, limit);
						}
						returnData.push(...this.helpers.returnJsonArray(responseData));

					} else if (operation === 'replaceText') {

						// ----------------------------------
						//      presentation: replaceText
						// ----------------------------------
						const presentationId = this.getNodeParameter('presentationId', i) as string;
						const texts = this.getNodeParameter('textUi.textValues', i, []) as IDataObject[];
						const options = this.getNodeParameter('options', i) as IDataObject;
						const requests = texts.map((text => {
							return {
								replaceAllText: {
									replaceText: text.replaceText,
									pageObjectIds: text.pageObjectIds || [],
									containsText: {
										text: text.text,
										matchCase: text.matchCase,
									},
								},
							};
						}));

						const body: IDataObject = {
							requests,
						};

						if (options.revisionId) {
							body['writeControl'] = {
								requiredRevisionId: options.revisionId as string,
							};
						}

						responseData = await googleApiRequest.call(this, 'POST', `/presentations/${presentationId}:batchUpdate`, { requests });
						returnData.push({ json: responseData });

					}
				}

			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({json:{ error: error.message }});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
