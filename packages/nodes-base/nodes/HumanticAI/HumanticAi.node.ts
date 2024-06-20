import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { humanticAiApiRequest } from './GenericFunctions';

import { profileFields, profileOperations } from './ProfileDescription';

export class HumanticAi implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Humantic AI',
		name: 'humanticAi',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
		icon: 'file:humanticai.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Humantic AI API',
		defaults: {
			name: 'Humantic AI',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'humanticAiApi',
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
						name: 'Profile',
						value: 'profile',
					},
				],
				default: 'profile',
			},
			// PROFILE
			...profileOperations,
			...profileFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = items.length;
		const qs: IDataObject = {};
		let responseData;
		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);
		for (let i = 0; i < length; i++) {
			if (resource === 'profile') {
				if (operation === 'create') {
					const userId = this.getNodeParameter('userId', i) as string;
					const sendResume = this.getNodeParameter('sendResume', i) as boolean;
					qs.userid = userId;

					if (sendResume) {
						const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i);
						const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
						const binaryDataBuffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);

						responseData = await humanticAiApiRequest.call(
							this,
							'POST',
							'/user-profile/create',
							{},
							qs,
							{
								formData: {
									resume: {
										value: binaryDataBuffer,
										options: {
											filename: binaryData.fileName,
										},
									},
								},
							},
						);
					} else {
						responseData = await humanticAiApiRequest.call(
							this,
							'GET',
							'/user-profile/create',
							{},
							qs,
						);
					}

					if (responseData.data !== undefined) {
						responseData = responseData.data;
					} else {
						delete responseData.usage_stats;
					}
				}
				if (operation === 'get') {
					const userId = this.getNodeParameter('userId', i) as string;
					const options = this.getNodeParameter('options', i);

					qs.userid = userId;

					if (options.persona) {
						qs.persona = (options.persona as string[]).join(',');
					}

					responseData = await humanticAiApiRequest.call(this, 'GET', '/user-profile', {}, qs);
					responseData = responseData.results;
				}
				if (operation === 'update') {
					const userId = this.getNodeParameter('userId', i) as string;
					const sendResume = this.getNodeParameter('sendResume', i) as string;
					qs.userid = userId;

					if (sendResume) {
						const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i);
						const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
						const binaryDataBuffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);

						responseData = await humanticAiApiRequest.call(
							this,
							'POST',
							'/user-profile/create',
							{},
							qs,
							{
								formData: {
									resume: {
										value: binaryDataBuffer,
										options: {
											filename: binaryData.fileName,
										},
									},
								},
							},
						);
						responseData = responseData.data;
					} else {
						const text = this.getNodeParameter('text', i) as string;
						const body: IDataObject = {
							text,
						};

						qs.userid = userId;

						responseData = await humanticAiApiRequest.call(
							this,
							'POST',
							'/user-profile/create',
							body,
							qs,
						);
						responseData = responseData.data;
					}
				}
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
