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
	openCellApiRequest,
} from './GenericFunctions';

import {
	customerFields,
	customerOperations,
} from './descriptions';

export class OpenCell implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Open Cell',
		name: 'openCell',
		icon: 'file:openCell.png',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume the Open Cell API',
		defaults: {
			name: 'Open Cell',
			color: '#ffffff',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Customer',
						value: 'customer',
					},
				],
				default: 'customer',
			},
			...customerOperations,
			...customerFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		let responseData;

		for (let i = 0; i < items.length; i++) {

			if (resource === 'customer') {

				// **********************************************************************
				//                                customer
				// **********************************************************************

				if (operation === 'create') {

					// ----------------------------------------
					//             customer: create
					// ----------------------------------------

					responseData = await openCellApiRequest.call(this, 'POST', '/account/customer');

				}

			}

			Array.isArray(responseData)
				? returnData.push(...responseData)
				: returnData.push(responseData);

		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}