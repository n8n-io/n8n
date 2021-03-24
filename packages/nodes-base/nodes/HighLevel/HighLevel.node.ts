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
	highLevelApiRequest,
} from './GenericFunctions';

import {
	contactFields,
	contactOperations,
} from './descriptions';

export class HighLevel implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'HighLevel',
		name: 'highLevel',
		icon: 'file:highLevel.png',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume the HighLevel API',
		defaults: {
			name: 'HighLevel',
			color: '#16416c',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'highLevelApi',
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
						name: 'Contact',
						value: 'contact',
					},
				],
				default: 'contact',
				description: 'Resource to consume',
			},
			...contactOperations,
			...contactFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		let responseData;

		for (let i = 0; i < items.length; i++) {

			if (resource === 'contact') {

				// **********************************************************************
				//                                contact
				// **********************************************************************

				if (operation === 'create') {

					// ----------------------------------------
					//             contact: create
					// ----------------------------------------

					// https://developers.gohighlevel.com/#3ae04a5f-a029-4855-8ad2-bccdf2a858ae

					const body: IDataObject = {
						email: this.getNodeParameter('email', i),
					};

					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

					if (Object.keys(additionalFields).length) {
						Object.assign(body, additionalFields);
					}

					responseData = await highLevelApiRequest.call(this, 'POST', `/contacts`, body);

				} else if (operation === 'delete') {

					// ----------------------------------------
					//             contact: delete
					// ----------------------------------------

					// https://developers.gohighlevel.com/#58f28e16-b4d5-47f9-9378-5f22d2189706

					const contactId = this.getNodeParameter('contactId', i);

					const endpoint = `/contacts/${contactId}`;
					responseData = await highLevelApiRequest.call(this, 'DELETE', endpoint);

				} else if (operation === 'get') {

					// ----------------------------------------
					//               contact: get
					// ----------------------------------------

					// https://developers.gohighlevel.com/#cc2dd625-abaa-4cdd-b506-46b8e36f6252

					const contactId = this.getNodeParameter('contactId', i);

					const endpoint = `/contacts/${contactId}`;
					responseData = await highLevelApiRequest.call(this, 'GET', endpoint);

				} else if (operation === 'update') {

					// ----------------------------------------
					//             contact: update
					// ----------------------------------------

					// https://developers.gohighlevel.com/#373479f5-6aaa-4be4-b854-40f0f78cd752

					const contactId = this.getNodeParameter('contactId', i);

					const body: IDataObject = {};
					const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

					if (Object.keys(updateFields).length) {
						Object.assign(body, updateFields);
					}

					const endpoint = `/contacts/${contactId}`;
					responseData = await highLevelApiRequest.call(this, 'PUT', endpoint, body);

				}

			}

			Array.isArray(responseData)
				? returnData.push(...responseData)
				: returnData.push(responseData);

		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
