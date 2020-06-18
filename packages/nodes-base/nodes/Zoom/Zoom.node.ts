import { IExecuteFunctions } from 'n8n-core';
import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import {
	zoomApiRequest,
	zoomApiRequestAllItems,
	validateJSON,
} from './GenericFunctions';

import {
	meetingOperations,
	meetingFields,
} from './ZoomOperations';
export class Zoom implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Zoom',
		name: 'zoom',
		group: ['input'],
		version: 1,
		description: 'Consume Zoom API',
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		defaults: {
			name: 'Zoom',
			color: '#772244'
		},
		icon: 'file:zoom.png',
		inputs: ['main'],
		outputs: ['main'],
		// credentials: [
		// 	{
		// 		name: 'zoomApi',
		// 		required: true,
		// 		displayOptions: {
		// 			show: {
		// 				authentication: ['accessToken']
		// 			}
		// 		}
		// 	},
		// 	{
		// 		name: 'zoomOAuth2Api',
		// 		required: true,
		// 		displayOptions: {
		// 			show: {
		// 				authentication: ['oAuth2']
		// 			}
		// 		}
		// 	}
		// ],
		credentials: [
			{
				name: 'zoomApi',
				required: true,
				displayOptions: {
					show: {
						authentication: [
							'accessToken',
						],
					},
				},
			},
			{
				name: 'zoomOAuth2Api',
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
						name: 'Access Token',
						value: 'accessToken',
					},
					{
						name: 'OAuth2',
						value: 'oAuth2',
					},
				],
				default: 'accessToken',
				description: 'The resource to operate on.',
			},
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Meeting',
						value: 'meeting'
					}
				],
				default: 'meeting',
				description: 'The resource to operate on.'
			},
			...meetingOperations,
			...meetingFields
		]

	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = (items.length as unknown) as number;
		let qs: IDataObject;
		let responseData;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		console.log(this.getCredentials('zoomOAuth2Api'));
		for (let i = 0; i < length; i++) {
			qs = {};
			if (resource === 'meeting') {

				if (operation === 'get') {
					const userId = this.getNodeParameter('userId', i) as string;

					responseData = await zoomApiRequest.call(
						this,
						'GET',
						`/meetings/${userId}`,
						{},
						qs
					);
				}
			}
		}
		if (Array.isArray(responseData)) {
			returnData.push.apply(returnData, responseData as IDataObject[]);
		} else {
			returnData.push(responseData as IDataObject);
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
