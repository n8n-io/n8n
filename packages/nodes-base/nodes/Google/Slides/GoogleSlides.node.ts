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
	googleApiRequest,
} from './GenericFunctions';

export interface IGoogleAuthCredentials {
	email: string;
	privateKey: string;
}

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
						],
					},
				},
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
		],
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
					responseData = await googleApiRequest.call(this, 'GET', `/${presentationId}/pages/${pageObjectId}`);

				} else if (operation === 'getThumbnail') {

					// ----------------------------------
					//         page: getThumbnail
					// ----------------------------------

					const presentationId = this.getNodeParameter('presentationId', i) as string;
					const pageObjectId = this.getNodeParameter('pageObjectId', i) as string;
					responseData = await googleApiRequest.call(this, 'GET', `/${presentationId}/pages/${pageObjectId}/thumbnail`);

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

					responseData = await googleApiRequest.call(this, 'POST', '', body);

		 		} else if (operation === 'get') {

					// ----------------------------------
					//         presentation: get
					// ----------------------------------

					const presentationId = this.getNodeParameter('presentationId', i) as string;
					responseData = await googleApiRequest.call(this, 'GET', `/${presentationId}`);

				} else if (operation === 'getSlides') {

					// ----------------------------------
					//      presentation: getSlides
					// ----------------------------------

					const presentationId = this.getNodeParameter('presentationId', i) as string;
					responseData = await googleApiRequest.call(this, 'GET', `/${presentationId}`, {}, { fields: 'slides' });

				}

			}

			Array.isArray(responseData)
				? returnData.push(...responseData)
				: returnData.push(responseData);

		}
		return [this.helpers.returnJsonArray(responseData)];
	}
}
