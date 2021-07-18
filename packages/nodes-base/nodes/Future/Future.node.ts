import { IExecuteFunctions } from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription
} from 'n8n-workflow';

import { OptionsWithUri } from 'request';
import {
	eventFields,
	eventOperations
} from '../Bitwarden/descriptions/EventDescription';

import { broadcastFields, broadcastOperations } from './BroadcastDescription';

export class Future implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Future',
		name: 'Future',
		icon: 'file:Future.svg',
		group: ['transform'],
		version: 1,
		description: 'Consume Future API',
		defaults: {
			name: 'Future',
			color: '#72084e',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'futureApiCredentials',
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
						name: 'Broadcast',
						value: 'broadcast',
					},
					// {
					// 	name: 'Message',
					// 	value: 'message'
					// }
				],
				default: 'broadcast',
				required: true,
				description: 'Resource to consume',
			},

			// Broadcast
			...broadcastOperations,
			...broadcastFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		let responseData;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		//Get credentials the user provided for this node
		const credentials = this.getCredentials('futureApiCredentials') as IDataObject;

		if (resource === 'broadcast') {
			if (operation === 'get') {
				// get email input
				const broadcast_id = this.getNodeParameter('broadcast_id', 0) as string;
				// get additional fields input
				// const additionalFields = this.getNodeParameter('additionalFields', 0) as IDataObject;
				const data: IDataObject = {
					broadcast_id
				};

				//Object.assign(data, additionalFields);
				Object.assign(data);

				//Make http request according to <https://sendgrid.com/docs/api-reference/>
				const options: OptionsWithUri = {
					headers: {
						Accept: 'application/json',
						token: `${credentials.token}`
					},
					method: 'GET',
					body: {
						contacts: [data]
					},
					uri: `https://sandbox-api.futureinvest.io/v9/broadcast/${broadcast_id}`,
					json: true
				};

				responseData = await this.helpers.request(options);
			}

			if (operation === 'send') {
				const user_id = this.getNodeParameter('user_id', 0) as string;
				const title = this.getNodeParameter('title', 0) as string;
				const body = this.getNodeParameter('body', 0) as string;

				const data: IDataObject = {
					title,
					body,
					include_tags: [],
					exclude_tags: [],
					include_users: [user_id],
					exclude_users: [],
					auto_send: true,
					require_action: 'none',
					sending_type: 'sendDirect',
					custom_actions: []
				};

				//Make http request according to <https://sendgrid.com/docs/api-reference/>
				const options: OptionsWithUri = {
					headers: {
						Accept: 'application/json',
						token: `${credentials.token}`
					},
					method: 'POST',
					body: data,
					uri: `https://sandbox-api.futureinvest.io/v9/broadcast`,
					json: true
				};

				responseData = await this.helpers.request(options);
			}
		}

		// Map data to n8n data
		return [this.helpers.returnJsonArray(responseData)];
	}
}
