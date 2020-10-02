import {
	BINARY_ENCODING,
	IExecuteFunctions,
} from 'n8n-core';

import {
	IBinaryData,
	IBinaryKeyData,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	mindeeApiRequest,
} from './GenericFunctions';
import { response } from 'express';

export class Mindee implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Mindee',
		name: 'mindee',
		icon: 'file:mindee.png',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Mindee API.',
		defaults: {
			name: 'Mindee',
			color: '#e94950',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'mindeeApi',
				required: true,
			}
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Receipt',
						value: 'receipt',
					},
				],
				default: 'receipt',
				description: 'The resource to operate on.'
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
				description: 'The resource to operate on.'
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
							'predict'
						],
						resource: [
							'receipt',
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

			if (resource === 'receipt') {
				if (operation === 'predict') {
					const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;

					const rawData = this.getNodeParameter('rawData', i) as boolean;

					if (items[i].binary === undefined) {
						throw new Error('No binary data exists on item!');
					}

					const item = items[i].binary as IBinaryKeyData;

					const binaryData = item[binaryPropertyName] as IBinaryData;

					if (binaryData === undefined) {
						throw new Error(`No binary data property "${binaryPropertyName}" does not exists on item!`);
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
									value: Buffer.from(binaryData.data, BINARY_ENCODING),
									options: {
										filename: binaryData.fileName,
									}
								},
							},
						},
					);

					if (rawData === false) {
						const newData: IDataObject = {};

						for (const key of Object.keys(responseData.predictions[0])) {

							const data = responseData.predictions[0][key];

							newData[key] = data.value || data.name || data.raw || data.degrees || data.amount || data.degrees;
						}

						responseData = newData;
					}
				}
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
