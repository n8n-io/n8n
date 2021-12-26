import { IExecuteFunctions } from 'n8n-core';

import {
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeApiError,
	NodeCredentialTestResult,
} from 'n8n-workflow';
import { OptionsWithUri } from 'request';

import {
	odooCreate,
	odooDelete,
	odooGet,
	odooGetAll,
	odooGetUserID,
	odooUpdate,
} from './GenericFunctions';

export class Odoo implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Odoo',
		name: 'odoo',
		icon: 'file:odoo.svg',
		group: ['transform'],
		version: 1,
		description: 'Consume Odoo API',
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
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
				testedBy: 'odooApiTest',
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				default: 'res.partner',
				noDataExpression: true,
				options: [
					{
						name: 'Calendar',
						value: 'calendar.event',
					},
					{
						name: 'Contact',
						value: 'res.partner',
					},
					{
						name: 'Crm',
						value: 'crm.lead',
					},
					{
						name: 'Custom Resource',
						value: 'custom',
					},
					{
						name: 'Inventory',
						value: 'stock.picking.type',
					},
					{
						name: 'Note',
						value: 'note.note',
					},
				],
				description: 'The resource to operate on',
			},

			//    Custom resource    ---------------------------------------------
			{
				displayName: 'Custom Resource',
				name: 'customResource',
				type: 'string',
				default: '',
				description: 'Specify custom resource',
				required: true,
				displayOptions: {
					show: {
						resource: ['custom'],
					},
				},
			},

			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				default: 'getAll',
				noDataExpression: true,
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a new item',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete an item',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get an item',
					},
					{
						name: 'Get All',
						value: 'getAll',
						description: 'Get all items',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update an item',
					},
				],
			},
			//    Create    ------------------------------------------------------
			{
				displayName: 'New Item (JSON)',
				name: 'newItem',
				type: 'json',
				default: '',
				description: 'Specify fields of a new item',
				placeholder: '{"memo": "New note"}',
				required: true,
				displayOptions: {
					show: {
						operation: ['create'],
					},
				},
			},

			//    Get       ------------------------------------------------------
			{
				displayName: 'Item ID',
				name: 'items_id',
				type: 'string',
				default: '',
				description: 'Specify ID of an item, or comma separated list of items ID',
				placeholder: '12 or 12,15,78...',
				required: true,
				displayOptions: {
					show: {
						operation: ['get', 'update', 'delete'],
					},
				},
			},

			{
				displayName: 'Fields To Include',
				name: 'fieldsToReturn',
				type: 'string',
				default: '',
				description: 'Specify field or fields that would be returned',
				placeholder: 'name or name,memo...',
				required: false,
				displayOptions: {
					show: {
						operation: ['get', 'getAll'],
					},
				},
			},

			//    Get All   ------------------------------------------------------

			{
				displayName: 'Filter Results',
				name: 'filterRequest',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
					multipleValueButtonText: 'Add Filter',
				},
				default: {},
				description: 'Filter request by applying filters',
				placeholder: 'Add condition',
				displayOptions: {
					show: {
						operation: ['getAll'],
					},
				},
				options: [
					{
						name: 'filter',
						displayName: 'Filter',
						values: [
							{
								displayName: 'Field Name',
								name: 'fieldName',
								type: 'string',
								default: '',
								description: 'Specify field name',
								required: true,
							},
							{
								displayName: 'Operator',
								name: 'operator',
								type: 'options',
								default: 'equal',
								description: 'Specify an operator',
								required: true,
								options: [
									{
										name: '!=',
										value: 'notEqual',
									},
									{
										name: '<',
										value: 'lesserThen',
									},
									{
										name: '=',
										value: 'equal',
									},
									{
										name: '=<',
										value: 'lesserOrEqual',
									},
									{
										name: '>',
										value: 'greaterThen',
									},
									{
										name: '>=',
										value: 'greaterOrEqual',
									},
									{
										name: 'Chield Of',
										value: 'childOf',
									},
									{
										name: 'In',
										value: 'in',
									},
									{
										name: 'Like',
										value: 'like',
									},
									{
										name: 'Not In',
										value: 'notIn',
									},
								],
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Specify value for comparison',
								required: true,
							},
						],
					},
				],
			},

			//    Update    ------------------------------------------------------
			{
				displayName: 'Fields To Update',
				name: 'fieldsToUpdate',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
					multipleValueButtonText: 'Add Field',
				},
				default: {},
				description: 'Add field and value',
				placeholder: '',
				displayOptions: {
					show: {
						operation: ['update'],
					},
				},
				options: [
					{
						displayName: 'Fields To Be Updated',
						name: 'fields',
						values: [
							{
								displayName: 'Field Name',
								name: 'fieldName',
								type: 'string',
								default: '',
								required: true,
							},
							{
								displayName: 'New Value',
								name: 'fieldValue',
								type: 'string',
								default: '',
								required: true,
							},
						],
					},
				],
			},
		],
	};

	methods = {
		credentialTest: {
			async odooApiTest(
				this: ICredentialTestFunctions,
				credential: ICredentialsDecrypted,
			): Promise<NodeCredentialTestResult> {
				const credentials = credential.data;

				const body = {
					jsonrpc: '2.0',
					method: 'call',
					params: {
						service: 'common',
						method: 'login',
						args: [credentials?.db, credentials?.username, credentials?.password],
					},
					id: Math.floor(Math.random() * 100),
				};

				let options: OptionsWithUri = {
					headers: {
						'User-Agent': 'https://n8n.io',
						Connection: 'keep-alive',
						Accept: '*/*',
						'Accept-Encoding': 'gzip, deflate, br',
						'Content-Type': 'application/json',
					},
					method: 'POST',
					body,
					uri: `${credentials?.url}/jsonrpc`,
					json: true,
				};

				try {
					const result = await this.helpers.request!(options);
					if (result.error || !result.result) {
						return {
							status: 'Error',
							message: `Credentials are not valid`,
						};
					} else if (result.error) {
						return {
							status: 'Error',
							message: `Credentials are not valid: ${result.error.data.message}`,
						};
					}
				} catch (error) {
					return {
						status: 'Error',
						message: `Settings are not valid: ${error}`,
					};
				}
				return {
					status: 'OK',
					message: 'Authentication successful!',
				};
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		let items = this.getInputData();
		items = JSON.parse(JSON.stringify(items));
		const returnData: IDataObject[] = [];
		let responseData;

		let resource = this.getNodeParameter('resource', 0) as string;
		if (resource === 'custom') {
			resource = this.getNodeParameter('customResource', 0) as string;
		}
		const operation = this.getNodeParameter('operation', 0) as string;

		const credentials = await this.getCredentials('odooApi');
		const url = credentials?.url as string;
		const username = credentials?.username as string;
		const password = credentials?.password as string;
		const db = (credentials?.db || url.split('//')[1].split('.')[0]) as string;
		const userID = await odooGetUserID.call(this, db, username, password, url);

		// const fieldsToUpdate = this.getNodeParameter('fieldsToUpdate', 0) as any;
		// console.log(
		// 	fieldsToUpdate?.fields.reduce((acc: any, record: any) => {
		// 		return Object.assign(acc, { [record.fieldName]: record.fieldValue });
		// 	}, {}),
		// );

		//----------------------------------------------------------------------
		//                            Main loop
		//----------------------------------------------------------------------

		for (let i = 0; i < items.length; i++) {
			try {
				//    Create    ------------------------------------------------------
				if (operation === 'create') {
					responseData = await odooCreate.call(
						this,
						db,
						userID,
						password,
						resource,
						operation,
						url,
						this.getNodeParameter('newItem', 0),
					);
				}

				//    Get       ------------------------------------------------------
				if (operation === 'get') {
					responseData = await odooGet.call(
						this,
						db,
						userID,
						password,
						resource,
						operation,
						url,
						this.getNodeParameter('items_id', 0),
						this.getNodeParameter('fieldsToReturn', 0),
					);
				}

				//    Get All   ------------------------------------------------------
				if (operation === 'getAll') {
					responseData = await odooGetAll.call(
						this,
						db,
						userID,
						password,
						resource,
						operation,
						url,
						this.getNodeParameter('filterRequest', 0),
						this.getNodeParameter('fieldsToReturn', 0),
					);
				}

				//    Update    ------------------------------------------------------
				if (operation === 'update') {
					responseData = await odooUpdate.call(
						this,
						db,
						userID,
						password,
						resource,
						operation,
						url,
						this.getNodeParameter('items_id', 0),
						this.getNodeParameter('fieldsToUpdate', 0),
					);
				}

				//    Delete    ------------------------------------------------------
				if (operation === 'delete') {
					responseData = await odooDelete.call(
						this,
						db,
						userID,
						password,
						resource,
						operation,
						url,
						this.getNodeParameter('items_id', 0),
					);
				}

				if (Array.isArray(responseData)) {
					returnData.push.apply(
						returnData,
						responseData.map((data) => data.result) as IDataObject[],
					);
				} else {
					returnData.push(responseData.result as IDataObject);
				}
			} catch (error: any) {
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
