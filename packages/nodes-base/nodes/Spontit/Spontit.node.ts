import type {
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { spontitApiRequest } from './GenericFunctions';

import { pushFields, pushOperations } from './PushDescription';

import moment from 'moment';

export class Spontit implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Spontit',
		name: 'spontit',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
		icon: 'file:spontit.png',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Spontit API',
		defaults: {
			name: 'Spontit',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'spontitApi',
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
						name: 'Push',
						value: 'push',
					},
				],
				default: 'push',
			},
			...pushOperations,
			...pushFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const timezone = this.getTimezone();
		let responseData;
		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);
		for (let i = 0; i < items.length; i++) {
			try {
				if (resource === 'push') {
					if (operation === 'create') {
						const content = this.getNodeParameter('content', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i);

						const body: IDataObject = {
							content,
						};

						Object.assign(body, additionalFields);

						if (body.pushToFollowers) {
							body.pushToFollowers = (body.pushToFollowers as string).split(',');
						}

						if (body.pushToPhoneNumbers) {
							body.pushToPhoneNumbers = (body.pushToPhoneNumbers as string).split(',');
						}

						if (body.pushToEmails) {
							body.pushToEmails = (body.pushToEmails as string).split(',');
						}

						if (body.schedule) {
							body.scheduled = moment.tz(body.schedule, timezone).unix();
						}

						if (body.expirationStamp) {
							body.expirationStamp = moment.tz(body.expirationStamp, timezone).unix();
						}

						responseData = await spontitApiRequest.call(this, 'POST', '/push', body);

						responseData = responseData.data;
					}
				}
				if (Array.isArray(responseData)) {
					returnData.push.apply(returnData, responseData as IDataObject[]);
				} else if (responseData !== undefined) {
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
