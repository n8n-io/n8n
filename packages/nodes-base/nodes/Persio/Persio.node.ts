import type { IExecuteFunctions } from 'n8n-core';

import type {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { persioApiRequest } from './GenericFunctions';

import { identifyFields, identifyOperations } from './IdentifyDescription';

import type { IIdentify } from './IdentifyInterface';

import { eventFields, eventOperations } from './EventDescription';

import type { IEvent } from './EventInterface';

import { v4 as uuid } from 'uuid';

export class Persio implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Persio',
		name: 'persio',
		icon: 'file:persio.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ":" + $parameter["resource"]}}',
		description: 'Persio API',
		defaults: {
			name: 'Persio',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'persioApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Identify',
						value: 'identify',
						description: 'Identify lets you tie a user to their actions',
					},
					{
						name: 'Event',
						value: 'event',
						description: 'Track lets you record events',
					},
				],
				default: 'identify',
			},
			...identifyOperations,
			...eventOperations,
			...identifyFields,
			...eventFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = items.length;
		let responseData;
		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);
		const uri = 'https://drain.persio.io/v1';

		for (let i = 0; i < length; i++) {
			try {
				if (resource === 'identify') {
					//https://segment.com/docs/connections/sources/catalog/libraries/server/http-api/#identify
					if (operation === 'create') {
						const external_id = this.getNodeParameter('external_id', i) as string;
						const email = this.getNodeParameter('email', i) as string;
						const first_name = this.getNodeParameter('first_name', i) as string;
						const last_name = this.getNodeParameter('last_name', i) as string;
						const phone = this.getNodeParameter('phone', i) as string;

						const context = (this.getNodeParameter('context', i) as IDataObject)
							.contextUi as IDataObject[];

						const address = (this.getNodeParameter('address', i) as IDataObject)
							.addressUi as IDataObject;

						const body: IIdentify = {
							api_version: 'v1',
							context: {},
							address: {},
							sent_at: Number(new Date()),
						};
						if (external_id) {
							body.external_id = external_id;
						} else {
							body.anonymous_id = uuid();
						}

						if (email) {
							body.email = email;
						}

						if (first_name) {
							body.first_name = first_name;
						}

						if (last_name) {
							body.last_name = last_name;
						}

						if (phone) {
							body.phone = phone;
						}

						if (address) {
							if (address.country) {
								body.address!.country = address.country as string;
							}
							if (address.state) {
								body.address!.state = address.state as string;
							}
							if (address.city) {
								body.address!.city = address.city as string;
							}
							if (address.street) {
								body.address!.street = address.street as string;
							}

							if (address.postal_code) {
								body.address!.postal_code = address.postal_code as string;
							}
						}

						if (context) {
							if (context && context.length !== 0) {
								for (const item of context) {
									body.context![item.key as string] = item.value;
								}
							}
						}

						responseData = await persioApiRequest.call(this, 'POST', `${uri}/user/identify`, body);
					}
				}
				if (resource === 'event') {
					if (operation === 'create') {
						const external_id = this.getNodeParameter('external_id', i) as string;
						const event_name = this.getNodeParameter('event_name', i) as string;
						const source = this.getNodeParameter('source', i) as string;

						const context = (this.getNodeParameter('context', i) as IDataObject)
							.contextUi as IDataObject[];
						const body: IEvent = {
							event_name,
							source,
							context: {},
							api_version: 'v1',
							sent_at: Number(new Date()),
						};
						if (external_id) {
							body.external_id = external_id;
						} else {
							body.anonymous_id = uuid();
						}
						if (context) {
							if (context && context.length !== 0) {
								for (const item of context) {
									body.context![item.key as string] = item.value;
								}
							}
						}

						responseData = await persioApiRequest.call(this, 'POST', `${uri}/user/event`, body);
					}
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: error.message });
					continue;
				}
				throw error;
			}
			if (Array.isArray(responseData)) {
				returnData.push.apply(returnData, responseData as IDataObject[]);
			} else {
				returnData.push(responseData as IDataObject);
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
