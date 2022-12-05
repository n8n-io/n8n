import { IExecuteFunctions } from 'n8n-core';
import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeApiError,
} from 'n8n-workflow';
import { validateJSON, veroApiRequest } from './GenericFunctions';
import { userFields, userOperations } from './UserDescription';
import { eventFields, eventOperations } from './EventDescripion';

export class Vero implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Vero',
		name: 'vero',
		icon: 'file:vero.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Vero API',
		defaults: {
			name: 'Vero',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'veroApi',
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
						name: 'User',
						value: 'user',
						description: 'Create, update and manage the subscription status of your users',
					},
					{
						name: 'Event',
						value: 'event',
						description: 'Track events based on actions your customers take in real time',
					},
				],
				default: 'user',
			},
			...userOperations,
			...eventOperations,
			...userFields,
			...eventFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = items.length;
		let responseData;
		for (let i = 0; i < length; i++) {
			try {
				const resource = this.getNodeParameter('resource', 0);
				const operation = this.getNodeParameter('operation', 0);
				//https://developers.getvero.com/?bash#users
				if (resource === 'user') {
					//https://developers.getvero.com/?bash#users-identify
					if (operation === 'create') {
						const id = this.getNodeParameter('id', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i);
						const jsonActive = this.getNodeParameter('jsonParameters', i);
						const body = {
							id,
						};
						if (additionalFields.email) {
							// @ts-ignore
							body.email = additionalFields.email as string;
						}
						if (!jsonActive) {
							const dataAttributesValues = (
								this.getNodeParameter('dataAttributesUi', i) as IDataObject
							).dataAttributesValues as IDataObject[];
							if (dataAttributesValues) {
								const dataAttributes = {};
								for (let index = 0; index < dataAttributesValues.length; index++) {
									// @ts-ignore
									dataAttributes[dataAttributesValues[index].key] =
										dataAttributesValues[index].value;
									// @ts-ignore
									body.data = dataAttributes;
								}
							}
						} else {
							const dataAttributesJson = validateJSON(
								this.getNodeParameter('dataAttributesJson', i) as string,
							);
							if (dataAttributesJson) {
								// @ts-ignore
								body.data = dataAttributesJson;
							}
						}
						try {
							responseData = await veroApiRequest.call(this, 'POST', '/users/track', body);
						} catch (error) {
							throw new NodeApiError(this.getNode(), error);
						}
					}
					//https://developers.getvero.com/?bash#users-alias
					if (operation === 'alias') {
						const id = this.getNodeParameter('id', i) as string;
						const newId = this.getNodeParameter('newId', i) as string;
						const body = {
							id,
							new_id: newId,
						};
						try {
							responseData = await veroApiRequest.call(this, 'PUT', '/users/reidentify', body);
						} catch (error) {
							throw new NodeApiError(this.getNode(), error);
						}
					}
					//https://developers.getvero.com/?bash#users-unsubscribe
					//https://developers.getvero.com/?bash#users-resubscribe
					//https://developers.getvero.com/?bash#users-delete
					if (
						operation === 'unsubscribe' ||
						operation === 'resubscribe' ||
						operation === 'delete'
					) {
						const id = this.getNodeParameter('id', i) as string;
						const body = {
							id,
						};
						try {
							responseData = await veroApiRequest.call(this, 'POST', `/users/${operation}`, body);
						} catch (error) {
							throw new NodeApiError(this.getNode(), error);
						}
					}
					//https://developers.getvero.com/?bash#tags-add
					//https://developers.getvero.com/?bash#tags-remove
					if (operation === 'addTags' || operation === 'removeTags') {
						const id = this.getNodeParameter('id', i) as string;
						const tags = (this.getNodeParameter('tags', i) as string).split(',');
						const body = {
							id,
						};
						if (operation === 'addTags') {
							// @ts-ignore
							body.add = JSON.stringify(tags);
						}
						if (operation === 'removeTags') {
							// @ts-ignore
							body.remove = JSON.stringify(tags);
						}
						try {
							responseData = await veroApiRequest.call(this, 'PUT', '/users/tags/edit', body);
						} catch (error) {
							throw new NodeApiError(this.getNode(), error);
						}
					}
				}
				//https://developers.getvero.com/?bash#events
				if (resource === 'event') {
					//https://developers.getvero.com/?bash#events-track
					if (operation === 'track') {
						const id = this.getNodeParameter('id', i) as string;
						const email = this.getNodeParameter('email', i) as string;
						const eventName = this.getNodeParameter('eventName', i) as string;
						const jsonActive = this.getNodeParameter('jsonParameters', i);
						const body = {
							identity: { id, email },
							event_name: eventName,
							email,
						};
						if (!jsonActive) {
							const dataAttributesValues = (
								this.getNodeParameter('dataAttributesUi', i) as IDataObject
							).dataAttributesValues as IDataObject[];
							if (dataAttributesValues) {
								const dataAttributes = {};
								for (let index = 0; index < dataAttributesValues.length; index++) {
									// @ts-ignore
									dataAttributes[dataAttributesValues[index].key] =
										dataAttributesValues[index].value;
									// @ts-ignore
									body.data = JSON.stringify(dataAttributes);
								}
							}
							const extraAttributesValues = (
								this.getNodeParameter('extraAttributesUi', i) as IDataObject
							).extraAttributesValues as IDataObject[];
							if (extraAttributesValues) {
								const extraAttributes = {};
								for (let index = 0; index < extraAttributesValues.length; index++) {
									// @ts-ignore
									extraAttributes[extraAttributesValues[index].key] =
										extraAttributesValues[index].value;
									// @ts-ignore
									body.extras = JSON.stringify(extraAttributes);
								}
							}
						} else {
							const dataAttributesJson = validateJSON(
								this.getNodeParameter('dataAttributesJson', i) as string,
							);
							if (dataAttributesJson) {
								// @ts-ignore
								body.data = JSON.stringify(dataAttributesJson);
							}
							const extraAttributesJson = validateJSON(
								this.getNodeParameter('extraAttributesJson', i) as string,
							);
							if (extraAttributesJson) {
								// @ts-ignore
								body.extras = JSON.stringify(extraAttributesJson);
							}
						}
						try {
							responseData = await veroApiRequest.call(this, 'POST', '/events/track', body);
						} catch (error) {
							throw new NodeApiError(this.getNode(), error);
						}
					}
				}
				if (Array.isArray(responseData)) {
					returnData.push.apply(returnData, responseData as IDataObject[]);
				} else {
					returnData.push(responseData as IDataObject);
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: error.message });
					continue;
				}
				throw error;
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
