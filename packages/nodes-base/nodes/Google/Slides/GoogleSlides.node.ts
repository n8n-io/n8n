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
			color: '#edba25',
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
				description: 'Resource to operate on',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a presentation',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get a presentation',
					},
					{
						name: 'Get Slides',
						value: 'getSlides',
						description: 'Get presentation slides',
					},
					{
						name: 'Replace Text',
						value: 'replaceText',
						description: 'Replace text in a presentation',
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
				description: 'Operation to perform',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Get a page',
					},
					{
						name: 'Get Thumbnail',
						value: 'getThumbnail',
						description: 'Get a thumbnail',
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
				description: 'Operation to perform',
			},
			{
				displayName: 'Title',
				name: 'title',
				description: 'Title of the presentation to create.',
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
				description: 'ID of the presentation to retrieve. Found in the presentation URL:<br><code>https://docs.google.com/presentation/d/PRESENTATION_ID/edit</code>',
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
				description: 'If all results should be returned or only up to a given limit.',
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
				description: 'How many results to return.',
			},
			{
				displayName: 'Page Object ID',
				name: 'pageObjectId',
				description: 'ID of the page object to retrieve.',
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
								displayName: 'Text',
								name: 'text',
								type: 'string',
								default: '',
								description: 'The text to search for in the shape or table.',
							},
							{
								displayName: 'Replace Text',
								name: 'replaceText',
								type: 'string',
								default: '',
								description: 'The text that will replace the matched text.',
							},
							{
								displayName: 'Match Case',
								name: 'matchCase',
								type: 'boolean',
								default: false,
								description: 'Indicates whether the search should respect case. True : the search is case sensitive. False : the search is case insensitive.',
							},
							{
								displayName: 'Page IDs',
								name: 'pageObjectIds',
								type: 'multiOptions',
								default: [],
								typeOptions: {
									loadOptionsMethod: 'getPages',
									loadOptionsDependsOn: [
										'presentationId',
									],
								},
								description: 'If non-empty, limits the matches to page elements only on the given pages.',
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
						description: `The revision ID of the presentation required for the write request.</br>
						If specified and the requiredRevisionId doesn't exactly match the presentation's</br>
						current revisionId, the request will not be processed and will return a 400 bad request error.`,
					},
				],
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
		const returnData: IDataObject[] = [];

		for (let i = 0; i < items.length; i++) {

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

				} else if (operation === 'getThumbnail') {

					// ----------------------------------
					//         page: getThumbnail
					// ----------------------------------

					const presentationId = this.getNodeParameter('presentationId', i) as string;
					const pageObjectId = this.getNodeParameter('pageObjectId', i) as string;
					responseData = await googleApiRequest.call(this, 'GET', `/presentations/${presentationId}/pages/${pageObjectId}/thumbnail`);

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

				} else if (operation === 'get') {

					// ----------------------------------
					//         presentation: get
					// ----------------------------------

					const presentationId = this.getNodeParameter('presentationId', i) as string;
					responseData = await googleApiRequest.call(this, 'GET', `/presentations/${presentationId}`);

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
				}
			}

			Array.isArray(responseData)
				? returnData.push(...responseData)
				: returnData.push(responseData);

		}
		return [this.helpers.returnJsonArray(responseData)];
	}
}
