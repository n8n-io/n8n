import { IExecuteFunctions } from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeApiError,
} from 'n8n-workflow';

import { odooJSONRPCRequest } from './GenericFunctions';

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
				displayName: 'Service',
				name: 'serviceJSONRPC',
				type: 'options',
				options: [
					{
						name: 'common',
						value: 'common',
					},
					{
						name: 'object',
						value: 'object',
					},
				],
				default: 'common',
				description: 'JSONRPC service.',
			},
			{
				displayName: 'Method',
				name: 'methodJSONRPC',
				type: 'options',
				default: '',
				options: [
					{
						name: 'login',
						value: 'login',
					},
					{
						name: 'version',
						value: 'version',
					},
				],
				displayOptions: {
					show: {
						serviceJSONRPC: ['common'],
					},
				},
			},
			{
				displayName: 'Method',
				name: 'methodJSONRPC',
				type: 'options',
				default: '',
				options: [
					{
						name: 'execute',
						value: 'execute',
					},
				],
				displayOptions: {
					show: {
						serviceJSONRPC: ['object'],
					},
				},
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		let responseData;

		const serviceJSONRPC = this.getNodeParameter('serviceJSONRPC', 0) as string;
		const methodJSONRPC = this.getNodeParameter('methodJSONRPC', 0) as string;

		const credentials = await this.getCredentials('odooApi');
		const url = credentials?.url as string;
		const username = credentials?.username;
		const password = credentials?.password;
		const db = credentials?.db || url.split('//')[1].split('.')[0];

		if (serviceJSONRPC === 'common') {
			if (methodJSONRPC === 'login') {
				try {
					const body = {
						jsonrpc: '2.0',
						method: 'call',
						params: {
							service: serviceJSONRPC,
							method: methodJSONRPC,
							args: [db, username, password],
						},
						id: Math.floor(Math.random() * 100),
					};

					const loginResult = await odooJSONRPCRequest.call(this, body, url);
					const uid = loginResult?.result;
					console.log(loginResult, db, serviceJSONRPC, methodJSONRPC);
				} catch (error) {
					throw new NodeApiError(this.getNode(), error);
				}
			}
		}

		if (serviceJSONRPC === 'object') {
			if (methodJSONRPC === 'execute') {
				try {
					const body = {
						jsonrpc: '2.0',
						method: 'call',
						params: {
							service: serviceJSONRPC,
							method: methodJSONRPC,
							args: [db, 2, password, 'account.move', 'fields_get', [], ['string', 'type', 'help']],
						},
						id: Math.floor(Math.random() * 100),
					};

					const result = await odooJSONRPCRequest.call(this, body, url);
					console.log(result);
				} catch (error) {
					throw new NodeApiError(this.getNode(), error);
				}
			}
		}
		return [[]];
	}
}
