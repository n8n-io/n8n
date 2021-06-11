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
	serviceNowApiRequest,
} from './GenericFunctions';

import {
	tableRecordFields,
	tableRecordOperations
} from './TableRecordDescription';

export class ServiceNow implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Service Now',
		name: 'serviceNow',
		icon: 'file:servicenow.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Service Now API',
		defaults: {
			name: 'Service Now',
			color: '#362d59',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'serviceNowOAuth2Api',
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
						name: 'Incident',
						value: 'incident',
					},
					{
						name: 'Table Record',
						value: 'tableRecord',
					},
					{
						name: 'User',
						value: 'user',
					},

				],
				default: 'user',
				description: 'Resource to consume.',
			},

			// TABLE RECORD
			...tableRecordOperations,
			...tableRecordFields,

		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = items.length;
		let responseData= {};
		const qs: IDataObject = {};
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < length; i++) {


			if (Array.isArray(responseData)) {
				returnData.push.apply(returnData, responseData as IDataObject[]);
			} else {
				returnData.push(responseData as IDataObject);
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
