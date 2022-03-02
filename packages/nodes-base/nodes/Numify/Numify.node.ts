import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { numify } from 'numify';

export class Numify implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Numify',
		name: 'Numify',
		icon: 'file:numify.svg',
		group: ['transform'],
		version: 1,
		description: 'Convert long numbers to human readable format',
		defaults: {
			name: 'Numify',
			color: '#00FE1B',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
		],
		properties: [
			{
				displayName: 'Number',
				name: 'number',
				type: 'number',
				required: true,
				default: '1000',
				description: 'Enter the number',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		let responseData;

		// get number input
		const number = this.getNodeParameter('number', 0) as number;

		const converted = numify(number);

		responseData = await converted;

		// Map data to n8n data
		return [this.helpers.returnJsonArray({ responseData })];
	}
}
