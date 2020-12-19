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

import * as moment from 'moment-timezone';

export class Iterable implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Iterable',
		name: 'iterable',
		icon: 'file:iterable.png',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Iterable API.',
		defaults: {
			name: 'Iterable',
			color: '#725ed8',
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
				options: [
					{
						name: 'Event',
						value: 'event',
					},
					{
						name: 'User',
						value: 'user',
					},
				],
				default: 'user',
				description: 'The resource to operate on.',
			},
			...eventOperations,
			...eventFields,
			...userOperations,
			...userFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = (items.length as unknown) as number;
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
						throw new Error('Either email or userId must be passed in to identify the user. Please add one of both via "Additional Fields". If both are passed in, email takes precedence.');
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
							throw new Error(
								`Iterable error response [400]: ${responseData.msg}`,
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
						endpoint =  `/users/${email}`;
					} else {
						const userId = this.getNodeParameter('userId', i) as string;
						endpoint = `/users/byUserId/${userId}`;
					}

					responseData = await iterableApiRequest.call(this, 'DELETE', endpoint);

					if (this.continueOnFail() === false) {
						if (responseData.code !== 'Success') {
							throw new Error(
								`Iterable error response [400]: ${responseData.msg}`,
							);
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
						endpoint =  `/users/getByEmail`;
						qs.email = email;
					} else {
						const userId = this.getNodeParameter('userId', i) as string;
						endpoint = `/users/byUserId/${userId}`;
					}

					responseData = await iterableApiRequest.call(this, 'GET', endpoint, {}, qs);

					if (this.continueOnFail() === false) {
						if (Object.keys(responseData).length === 0) {
							throw new Error(
								`Iterable error response [404]: User not found`,
							);
						}
					}

					responseData = responseData.user || {};
					returnData.push(responseData);
				}
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
