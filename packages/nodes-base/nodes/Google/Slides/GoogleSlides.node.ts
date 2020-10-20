
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

export class GoogleSlides implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Google Slides',
		name: 'googleSlides',
		icon: 'file:googleslides.svg',
		group: ['input', 'output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Read data from Google Slides',
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
						name: 'Presentation',
						value: 'presentation',
					},
					{
						name: 'Page',
						value: 'page',
					},
				],
				default: 'presentation',
				description: 'The resource to operate on',
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
				],
				displayOptions: {
					show: {
						resource: [
							'presentation',
						],
					},
				},
				default: 'create',
				description: 'The operation to perform',
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
				description: 'The operation to perform',
			},

			// ----------------------------------
			//         All
			// ----------------------------------
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'create',
						],
						resource: [
							'presentation',
						],
					},
				},
			},
			{
				displayName: 'Presentation ID',
				name: 'presentationId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'get',
							'getThumbnail'
						],
						resource: [
							'presentation',
							'page',
						],
					},
				},
			},
			{
				displayName: 'Page Object ID',
				name: 'pageObjectId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'get',
							'getThumbnail',
						],
						resource: [
							'page',
						],
					},
				},
			},
		],
	};


	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const length = items.length as unknown as number;

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		const responseData = [];

		for (let i=0; i < length; i++) {
			if (resource === 'presentation') {
				if (operation === 'create') {
					const title = this.getNodeParameter('title', i) as string;
					let body = {
						"title": title
					};

					const response = await googleApiRequest.call(this, 'POST', `/v1/presentations`, body);
					responseData.push(response);
		 		} else if (operation === 'get') {
					const presentationId = this.getNodeParameter('presentationId', i) as string;

					const response = await googleApiRequest.call(this, 'GET', `/v1/presentations/${presentationId}`, {});
					responseData.push(response);
			 	}
			} else if (resource === 'page') {
				if (operation === 'get') {
					const presentationId = this.getNodeParameter('presentationId', i) as string;
					const pageObjectId = this.getNodeParameter('pageObjectId', i) as string;

					const response = await googleApiRequest.call(this, 'GET', `/v1/presentations/${presentationId}/pages/${pageObjectId}`, {});
					responseData.push(response);
				} else if (operation === 'getThumbnail') {
					const presentationId = this.getNodeParameter('presentationId', i) as string;
					const pageObjectId = this.getNodeParameter('pageObjectId', i) as string;

					const response = await googleApiRequest.call(this, 'GET', `/v1/presentations/${presentationId}/pages/${pageObjectId}/thumbnail`, {});
					responseData.push(response);
				}
			}
		}
		return [this.helpers.returnJsonArray(responseData)];
	}
}
