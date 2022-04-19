import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IBinaryData,
	IBinaryKeyData,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import {
	cleanData,
	mindeeApiRequest,
} from './GenericFunctions';

export class Mindee implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Mindee',
		name: 'mindee',
		icon: 'file:mindee.svg',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Mindee API',
		defaults: {
			name: 'Mindee',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'mindeeReceiptApi',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'receipt',
						],
					},
				},
			},
			{
				name: 'mindeeInvoiceApi',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'invoice',
						],
					},
				},
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Invoice',
						value: 'invoice',
					},
					{
						name: 'Receipt',
						value: 'receipt',
					},
				],
				default: 'receipt',
				description: 'The resource to operate on.',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				options: [
					{
						name: 'Predict',
						value: 'predict',
					},
				],
				default: 'predict',
				description: 'The resource to operate on.',
			},
			{
				displayName: 'Binary Property',
				name: 'binaryPropertyName',
				type: 'string',
				required: true,
				default: 'data',
				displayOptions: {
					show: {
						operation: [
							'predict',
						],
						resource: [
							'receipt',
							'invoice',
						],
					},
				},
				description: 'Name of the binary property which containsthe data for the file to be uploaded.',
			},
			{
				displayName: 'RAW Data',
				name: 'rawData',
				type: 'boolean',
				default: false,
				description: `Returns the data exactly in the way it got received from the API.`,
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = (items.length as unknown) as number;
		const qs: IDataObject = {};
		let responseData;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		for (let i = 0; i < length; i++) {
			try {
				if (resource === 'receipt') {
					if (operation === 'predict') {
						const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;

						const rawData = this.getNodeParameter('rawData', i) as boolean;

						if (items[i].binary === undefined) {
							throw new NodeOperationError(this.getNode(), 'No binary data exists on item!');
						}

						const item = items[i].binary as IBinaryKeyData;

						const binaryData = item[binaryPropertyName] as IBinaryData;
						const dataBuffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);

						if (binaryData === undefined) {
							throw new NodeOperationError(this.getNode(), `No binary data property "${binaryPropertyName}" does not exists on item!`);
						}

						responseData = await mindeeApiRequest.call(
							this,
							'POST',
							`/expense_receipts/v2/predict`,
							{},
							{},
							{
								formData: {
									file: {
										value: dataBuffer,
										options: {
											filename: binaryData.fileName,
										},
									},
								},
							},
						);

						if (rawData === false) {
							responseData = cleanData(responseData.predictions);
						}
					}
				}

				if (resource === 'invoice') {
					if (operation === 'predict') {
						const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;

						const rawData = this.getNodeParameter('rawData', i) as boolean;

						if (items[i].binary === undefined) {
							throw new NodeOperationError(this.getNode(), 'No binary data exists on item!');
						}

						const item = items[i].binary as IBinaryKeyData;

						const binaryData = item[binaryPropertyName] as IBinaryData;
						const dataBuffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);

						if (binaryData === undefined) {
							throw new NodeOperationError(this.getNode(), `No binary data property "${binaryPropertyName}" does not exists on item!`);
						}

						responseData = await mindeeApiRequest.call(
							this,
							'POST',
							`/invoices/v1/predict`,
							{},
							{},
							{
								formData: {
									file: {
										value: dataBuffer,
										options: {
											filename: binaryData.fileName,
										},
									},
								},
							},
						);

						if (rawData === false) {
							responseData = cleanData(responseData.predictions);
						}
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
