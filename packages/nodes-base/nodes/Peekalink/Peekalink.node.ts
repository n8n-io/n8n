import type { IExecuteFunctions } from 'n8n-core';

import type {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { peekalinkApiRequest } from './GenericFunctions';

export class Peekalink implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Peekalink',
		name: 'peekalink',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
		icon: 'file:peekalink.png',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"]',
		description: 'Consume the Peekalink API',
		defaults: {
			name: 'Peekalink',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'peekalinkApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Is Available',
						value: 'isAvailable',
						description: 'Check whether preview for a given link is available',
						action: 'Check whether the preview for a given link is available',
					},
					{
						name: 'Preview',
						value: 'preview',
						description: 'Return the preview for a link',
						action: 'Return the preview for a link',
					},
				],
				default: 'preview',
			},
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				default: '',
				required: true,
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = items.length;
		let responseData;
		const operation = this.getNodeParameter('operation', 0);

		for (let i = 0; i < length; i++) {
			try {
				if (operation === 'isAvailable') {
					const url = this.getNodeParameter('url', i) as string;
					const body: IDataObject = {
						link: url,
					};

					responseData = await peekalinkApiRequest.call(this, 'POST', '/is-available/', body);
				}
				if (operation === 'preview') {
					const url = this.getNodeParameter('url', i) as string;
					const body: IDataObject = {
						link: url,
					};

					responseData = await peekalinkApiRequest.call(this, 'POST', '/', body);
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
