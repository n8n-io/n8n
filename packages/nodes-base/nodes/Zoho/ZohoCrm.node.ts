import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeTypeDescription,
	INodeType,
} from 'n8n-workflow';

import {
	zohoApiRequest,
	zohoApiRequestAllItems,
} from './GenericFunctions';

import {
	leadOperations,
	leadFields,
} from './LeadDescription';

export class ZohoCrm implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Zoho CRM',
		name: 'zohoCrm',
		icon: 'file:zohoCrm.png',
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		group: ['input'],
		version: 1,
		description: 'Consume Zoho CRM API.',
		defaults: {
			name: 'Zoho CRM',
			color: '#CE2232',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'zohoOAuth2Api',
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
						name: 'Lead',
						value: 'lead',
					},
				],
				default: 'lead',
				description: 'The resource to operate on.',
			},
			...leadOperations,
			...leadFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = items.length as unknown as number;
		let responseData;
		for (let i = 0; i < length; i++) {
			const resource = this.getNodeParameter('resource', 0) as string;
			const operation = this.getNodeParameter('operation', 0) as string;
			if (resource === 'lead') {
				if (operation === 'create') {
					const lastName = this.getNodeParameter('lastName', i) as string;
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					const body = {
						Last_Name: lastName,
					};
					// if (additionalFields.email) {
					// 	// @ts-ignore
					// 	body.email = additionalFields.email as string;
					// }
					responseData = await zohoApiRequest.call(this, 'POST', '/leads', body);
					responseData = responseData.data;
				} else {
					throw new Error(`The operation "${operation}" is not known!`);
				}
			} else {
				throw new Error(`The resource "${resource}" is not known!`);
			}

			if (Array.isArray(responseData)) {
				returnData.push.apply(returnData, responseData as IDataObject[]);
			} else if (responseData !== undefined) {
				returnData.push(responseData as IDataObject);
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
