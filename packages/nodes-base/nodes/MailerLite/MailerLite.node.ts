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
	mailerliteApiRequest,
	mailerliteApiRequestAllItems,
} from './GenericFunctions';

import {
	subscriberFields,
	subscriberOperations,
} from './SubscriberDescription';

export class MailerLite implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'MailerLite',
		name: 'mailerLite',
		icon: 'file:mailerLite.png',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Mailer Lite API',
		defaults: {
			name: 'MailerLite',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'mailerLiteApi',
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
						name: 'Subscriber',
						value: 'subscriber',
					},
				],
				default: 'subscriber',
			},
			...subscriberOperations,
			...subscriberFields,
		],
	};

	methods = {
		loadOptions: {
			// Get all the available custom fields to display them to user so that he can
			// select them easily
			async getCustomFields(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const fields = await mailerliteApiRequest.call(this, 'GET', '/fields');
				for (const field of fields) {
					returnData.push({
						name: field.key,
						value: field.key,
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
		const qs: IDataObject = {};
		let responseData;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		for (let i = 0; i < length; i++) {
			try {
				if (resource === 'subscriber') {
					//https://developers.mailerlite.com/reference#create-a-subscriber
					if (operation === 'create') {
						const email = this.getNodeParameter('email', i) as string;

						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						const body: IDataObject = {
							email,
							fields: [],
						};

						Object.assign(body, additionalFields);

						if (additionalFields.customFieldsUi) {
							const customFieldsValues = (additionalFields.customFieldsUi as IDataObject).customFieldsValues as IDataObject[];

							if (customFieldsValues) {
								const fields = {};

								for (const customFieldValue of customFieldsValues) {
									//@ts-ignore
									fields[customFieldValue.fieldId] = customFieldValue.value;
								}

								body.fields = fields;
								delete body.customFieldsUi;
							}
						}

						responseData = await mailerliteApiRequest.call(this, 'POST', '/subscribers', body);
					}
					//https://developers.mailerlite.com/reference#single-subscriber
					if (operation === 'get') {
						const subscriberId = this.getNodeParameter('subscriberId', i) as string;

						responseData = await mailerliteApiRequest.call(this, 'GET', `/subscribers/${subscriberId}`);
					}
					//https://developers.mailerlite.com/reference#subscribers
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;

						const filters = this.getNodeParameter('filters', i) as IDataObject;

						Object.assign(qs, filters);

						if (returnAll) {

							responseData = await mailerliteApiRequestAllItems.call(this, 'GET', `/subscribers`, {}, qs);
						} else {
							qs.limit = this.getNodeParameter('limit', i) as number;

							responseData = await mailerliteApiRequest.call(this, 'GET', `/subscribers`, {}, qs);
						}
					}
					//https://developers.mailerlite.com/reference#update-subscriber
					if (operation === 'update') {
						const subscriberId = this.getNodeParameter('subscriberId', i) as string;

						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

						const body: IDataObject = {};

						Object.assign(body, updateFields);

						if (updateFields.customFieldsUi) {
							const customFieldsValues = (updateFields.customFieldsUi as IDataObject).customFieldsValues as IDataObject[];

							if (customFieldsValues) {
								const fields = {};

								for (const customFieldValue of customFieldsValues) {
									//@ts-ignore
									fields[customFieldValue.fieldId] = customFieldValue.value;
								}

								body.fields = fields;
								delete body.customFieldsUi;
							}
						}

						responseData = await mailerliteApiRequest.call(this, 'PUT', `/subscribers/${subscriberId}`, body);
					}
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: error.message });
					continue;
				}
				throw error;
			}
		}
		if (Array.isArray(responseData)) {
			returnData.push.apply(returnData, responseData as IDataObject[]);

		} else if (responseData !== undefined) {
			returnData.push(responseData as IDataObject);
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
