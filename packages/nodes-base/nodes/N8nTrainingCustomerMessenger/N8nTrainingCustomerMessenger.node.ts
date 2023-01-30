import type { IExecuteFunctions } from 'n8n-core';

import type {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

export class N8nTrainingCustomerMessenger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Customer Messenger (n8n training)',
		name: 'n8nTrainingCustomerMessenger',
		icon: 'file:n8nTrainingCustomerMessenger.svg',
		group: ['transform'],
		version: 1,
		description: 'Dummy node used for n8n training',
		defaults: {
			name: 'Customer Messenger (n8n training)',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Customer ID',
				name: 'customerId',
				type: 'string',
				required: true,
				default: '',
			},
			{
				displayName: 'Message',
				name: 'message',
				type: 'string',
				required: true,
				typeOptions: {
					rows: 4,
				},
				default: '',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = items.length;
		let responseData;

		for (let i = 0; i < length; i++) {
			const customerId = this.getNodeParameter('customerId', i) as string;

			const message = this.getNodeParameter('message', i) as string;

			responseData = { output: `Sent message to customer ${customerId}:  ${message}` };

			returnData.push(responseData);
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
