import { IExecuteFunctions } from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeApiError,
} from 'n8n-workflow';

import { mapOperationToJSONRPC, odooGetUserID, odooJSONRPCRequest } from './GenericFunctions';

export class Odoo implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Odoo',
		name: 'odoo',
		icon: 'file:odoo.svg',
		group: ['transform'],
		version: 1,
		description: 'Consume Odoo API',
		defaults: {
			name: 'Odoo',
			color: '#714B67',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'odooApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				default: 'res.partner',
				options: [
					{
						name: 'Contact',
						value: 'res.partner',
					},
					{
						name: 'Note',
						value: 'note.note',
					},
					{
						name: 'CRM',
						value: 'crm.lead',
					},
					{
						name: 'Calendar',
						value: 'calendar.event',
					},
					{
						name: 'Invoice',
						value: 'account.move',
					},
					{
						name: 'Inventory',
						value: 'stock.picking.type',
					},
				],
				description: 'The resource to operate on.',
			},

			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				default: 'search_read',
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a new item.',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update an item.',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get an item.',
					},
					{
						name: 'Get All',
						value: 'getAll',
						description: 'Get all items.',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete an item.',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		let responseData;

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		const serviceJSONRPC = 'object';
		const methodJSONRPC = 'execute';

		const credentials = await this.getCredentials('odooApi');
		const url = credentials?.url as string;
		const username = credentials?.username as string;
		const password = credentials?.password as string;
		const db = (credentials?.db || url.split('//')[1].split('.')[0]) as string;
		const userID = await odooGetUserID.call(this, db, username, password, url);

		//----------------------------------------------------------------------
		//                    Testing, delete after!!!
		//----------------------------------------------------------------------
		try {
			const body = {
				jsonrpc: '2.0',
				method: 'call',
				params: {
					service: serviceJSONRPC,
					method: methodJSONRPC,
					args: [db, userID, password, resource, 'search_read', [], ['name']],
				},
				id: Math.floor(Math.random() * 100),
			};

			responseData = await odooJSONRPCRequest.call(this, body, url);
			if (Array.isArray(responseData)) {
				returnData.push.apply(returnData, responseData.map((data) => data.result) as IDataObject[]);
			} else {
				returnData.push(responseData.result as IDataObject);
			}
		} catch (error: any) {
			throw new NodeApiError(this.getNode(), error);
		}

		//----------------------------------------------------------------------
		//                            Main loop
		//----------------------------------------------------------------------

		for (let i = 0; i < items.length; i++) {
			//    Create    ------------------------------------------------------
			if (operation === 'create') {
				console.log('Operation: ', mapOperationToJSONRPC[operation]);
			}

			//    Get       ------------------------------------------------------
			if (operation === 'get') {
				console.log('Operation: ', mapOperationToJSONRPC[operation]);
			}

			//    Get All   ------------------------------------------------------
			if (operation === 'getAll') {
				console.log('Operation: ', mapOperationToJSONRPC[operation]);
			}

			//    Update    ------------------------------------------------------
			if (operation === 'update') {
				console.log('Operation: ', mapOperationToJSONRPC[operation]);
			}

			//    Delete    ------------------------------------------------------
			if (operation === 'delete') {
				console.log('Operation: ', mapOperationToJSONRPC[operation]);
			}

			Array.isArray(responseData)
				? returnData.push(...responseData)
				: returnData.push(responseData);
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
