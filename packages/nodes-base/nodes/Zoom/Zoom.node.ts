import { IExecuteFunctions } from 'n8n-core';
import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription
} from 'n8n-workflow';
import {
	zoomApiRequest,
	zoomApiRequestAllItems,
	validateJSON
} from './GenericFunctions';
export class Zoom implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Zoom',
		name: 'zoom',
		group: ['input'],
		version: 1,
		description: 'Consume Zoom API',
		defaults: {
			name: 'Zoom',
			color: '#772244'
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'zoomApi',
				required: true,
				displayOptions: {
					show: {
						authentication: ['accessToken']
					}
				}
			},
			{
				name: 'zoomOAuth2Api',
				required: true,
				displayOptions: {
					show: {
						authentication: ['oAuth2']
					}
				}
			}
		],
		properties: [
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				options: [
					{
						name: 'Access Token',
						value: 'accessToken'
					},
					{
						name: 'OAuth2',
						value: 'oAuth2'
					}
				],
				default: 'accessToken',
				description: 'The resource to operate on.'
			}
		]
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = (items.length as unknown) as number;
		let qs: IDataObject;
		let responseData;
		const authentication = this.getNodeParameter('authentication', 0) as string;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		for (let i = 0; i < length; i++) {
			qs = {};
			if (resource === 'channel') {
				//https://api.slack.com/methods/conversations.archive
				if (operation === 'archive') {
					const channel = this.getNodeParameter('channelId', i) as string;
					const body: IDataObject = {
						channel
					};
					responseData = await zoomApiRequest.call(
						this,
						'POST',
						'/conversations.archive',
						body,
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
