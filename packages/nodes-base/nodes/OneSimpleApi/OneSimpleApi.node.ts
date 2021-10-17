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
	oneSimpleApiRequest,
} from './GenericFunctions';

export class OneSimpleApi implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'One Simple API',
		name: 'oneSimpleApi',
		icon: 'file:oneSimpleApi.png',
		group: ['transform'],
		version: 1,
		description: 'Consume One Simple API',
		defaults: {
				name: 'One Simple API',
				color: '#1A82e2',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'oneSimpleApi',
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
						name: 'Email Validation',
						value: 'emailValidation',
					},
					{
						name: 'Exchange Rate',
						value: 'exchangeRate',
					},
					{
						name: 'Expand URL',
						value: 'expandURL',
					},
					{
						name: 'Image Information',
						value: 'imageInformation',
					},
					{
						name: 'PDF',
						value: 'pdf',
					},
					{
						name: 'QR Codes',
						value: 'qrCodes',
					},
					{
						name: 'Screenshot',
						value: 'screenshot',
					},
					{
						name: 'Web Page Infomration',
						value: 'webPageInformation',
					},
				],
				default: 'emailValidation',
				required: true,
				description: 'Resource to consume',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'emailValidation',
						],
					},
				},
				options: [
					{
						name: 'Validate',
						value: 'validate',
						description: 'Validate an email address',
					},
				],
				default: 'validate',
				description: 'The operation to perform.',
			},
			// emailValidation: validate
			{
				displayName: 'Email Address',
				name: 'emailAddress',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'validate',
						],
						resource: [
							'emailValidation',
						],
					},
				},
				default:'',
				description:'Email Address',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = items.length as unknown as number;
		const qs: IDataObject = {};
		let responseData;
		for (let i = 0; i < length; i++) {
			try {
				const resource = this.getNodeParameter('resource', 0) as string;
				const operation = this.getNodeParameter('operation', 0) as string;

				if (resource === 'emailValidation') {
					if (operation === 'validate') {
						const emailAddress = this.getNodeParameter('emailAddress', i) as string;
						responseData = await oneSimpleApiRequest.call(this, 'GET', '/email', { emailAddress });
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
