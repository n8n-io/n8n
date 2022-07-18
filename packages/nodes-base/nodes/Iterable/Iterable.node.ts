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
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';

import {
	iterableApiRequest,
} from './GenericFunctions';

import {
	eventFields,
	eventOperations,
} from './EventDescription';

import {
	userFields,
	userOperations,
} from './UserDescription';

import {
	userListFields,
	userListOperations,
} from './UserListDescription';

import moment from 'moment-timezone';

export class Iterable implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Iterable',
		name: 'iterable',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
		icon: 'file:iterable.png',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Iterable API',
		defaults: {
			name: 'Iterable',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'iterableApi',
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
						name: 'Event',
						value: 'event',
					},
					{
						name: 'User',
						value: 'user',
					},
					{
						name: 'User List',
						value: 'userList',
					},
				],
				default: 'user',
			},
			...eventOperations,
			...eventFields,
			...userOperations,
			...userFields,
			...userListOperations,
			...userListFields,
		],
	};

	methods = {
		loadOptions: {
			// Get all the lists available channels
			async getLists(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const { lists } = await iterableApiRequest.call(this, 'GET', '/lists');
				const returnData: INodePropertyOptions[] = [];
				for (const list of lists) {
					returnData.push({
						name: list.name,
						value: list.id,
					});
				}
				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = items.length;
		const timezone = this.getTimezone();
		const qs: IDataObject = {};
		let responseData;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		if (resource === 'event') {
			if (operation === 'track') {
				// https://api.iterable.com/api/docs#events_trackBulk
				const events = [];

				for (let i = 0; i < length; i++) {

					const name = this.getNodeParameter('name', i) as string;

					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

					if (!additionalFields.email && !additionalFields.id) {
						throw new NodeOperationError(this.getNode(), 'Either email or userId must be passed in to identify the user. Please add one of both via "Additional Fields". If both are passed in, email takes precedence.', { itemIndex: i });
					}

					const body: IDataObject = {
						eventName: name,
					};

					Object.assign(body, additionalFields);

					if (body.dataFieldsUi) {
						const dataFields = (body.dataFieldsUi as IDataObject).dataFieldValues as IDataObject[];
						const data: IDataObject = {};
						for (const dataField of dataFields) {
							data[dataField.key as string] = dataField.value;
						}
						body.dataFields = data;
						delete body.dataFieldsUi;
					}

					if (body.createdAt) {
						body.createdAt = moment.tz(body.createdAt, timezone).unix();
					}

					events.push(body);
				}

				responseData = await iterableApiRequest.call(this, 'POST', '/events/trackBulk', { events });

				returnData.push(responseData);
			}
		}

		if (resource === 'user') {
			if (operation === 'upsert') {
				// https://api.iterable.com/api/docs#users_updateUser
				for (let i = 0; i < length; i++) {

					const identifier = this.getNodeParameter('identifier', i) as string;

					const value = this.getNodeParameter('value', i) as string;

					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

					const body: IDataObject = {};

					if (identifier === 'email') {
						body.email = value;
					} else {
						body.preferUserId = this.getNodeParameter('preferUserId', i) as boolean;
						body.userId = value;
					}

					Object.assign(body, additionalFields);

					if (body.dataFieldsUi) {
						const dataFields = (body.dataFieldsUi as IDataObject).dataFieldValues as IDataObject[];
						const data: IDataObject = {};
						for (const dataField of dataFields) {
							data[dataField.key as string] = dataField.value;
						}
						body.dataFields = data;
						delete body.dataFieldsUi;
					}

					responseData = await iterableApiRequest.call(this, 'POST', '/users/update', body);

					if (this.continueOnFail() === false) {
						if (responseData.code !== 'Success') {
							throw new NodeOperationError(this.getNode(),
								`Iterable error response [400]: ${responseData.msg}`, { itemIndex: i },
							);
						}
					}

					returnData.push(responseData);
				}
			}

			if (operation === 'delete') {
				// https://api.iterable.com/api/docs#users_delete
				// https://api.iterable.com/api/docs#users_delete_0
				for (let i = 0; i < length; i++) {
					const by = this.getNodeParameter('by', i) as string;

					let endpoint;

					if (by === 'email') {
						const email = this.getNodeParameter('email', i) as string;
						endpoint = `/users/${email}`;
					} else {
						const userId = this.getNodeParameter('userId', i) as string;
						endpoint = `/users/byUserId/${userId}`;
					}

					responseData = await iterableApiRequest.call(this, 'DELETE', endpoint);

					if (this.continueOnFail() === false) {
						if (responseData.code !== 'Success') {
							throw new NodeApiError(this.getNode(), responseData);
						}
					}

					returnData.push(responseData);
				}
			}

			if (operation === 'get') {
				// https://api.iterable.com/api/docs#users_getUser
				// https://api.iterable.com/api/docs#users_getUserById
				for (let i = 0; i < length; i++) {

					const by = this.getNodeParameter('by', i) as string;

					let endpoint;

					if (by === 'email') {
						const email = this.getNodeParameter('email', i) as string;
						endpoint = `/users/getByEmail`;
						qs.email = email;
					} else {
						const userId = this.getNodeParameter('userId', i) as string;
						endpoint = `/users/byUserId/${userId}`;
					}

					responseData = await iterableApiRequest.call(this, 'GET', endpoint, {}, qs);

					if (this.continueOnFail() === false) {
						if (Object.keys(responseData).length === 0) {
							throw new NodeApiError(this.getNode(), responseData,
								{ message: `User not found`, httpCode: '404' },
							);
						}
					}

					responseData = responseData.user || {};
					returnData.push(responseData);
				}
			}
		}

		if (resource === 'userList') {
			if (operation === 'add') {
				//https://api.iterable.com/api/docs#lists_subscribe
				const listId = this.getNodeParameter('listId', 0) as string;

				const identifier = this.getNodeParameter('identifier', 0) as string;

				const body: IDataObject = {
					listId: parseInt(listId, 10),
					subscribers: [],
				};

				const subscribers: IDataObject[] = [];

				for (let i = 0; i < length; i++) {

					const value = this.getNodeParameter('value', i) as string;

					if (identifier === 'email') {
						subscribers.push({ email: value });
					} else {
						subscribers.push({ userId: value });
					}
				}

				body.subscribers = subscribers;

				responseData = await iterableApiRequest.call(this, 'POST', '/lists/subscribe', body);

				returnData.push(responseData);
			}

			if (operation === 'remove') {
				//https://api.iterable.com/api/docs#lists_unsubscribe
				const listId = this.getNodeParameter('listId', 0) as string;

				const identifier = this.getNodeParameter('identifier', 0) as string;

				const additionalFields = this.getNodeParameter('additionalFields', 0) as IDataObject;

				const body: IDataObject = {
					listId: parseInt(listId, 10),
					subscribers: [],
					campaignId: additionalFields.campaignId as number,
					channelUnsubscribe: additionalFields.channelUnsubscribe as boolean,
				};

				const subscribers: IDataObject[] = [];

				for (let i = 0; i < length; i++) {

					const value = this.getNodeParameter('value', i) as string;

					if (identifier === 'email') {
						subscribers.push({ email: value });
					} else {
						subscribers.push({ userId: value });
					}
				}

				body.subscribers = subscribers;

				responseData = await iterableApiRequest.call(this, 'POST', '/lists/unsubscribe', body);

				returnData.push(responseData);
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
