import { IExecuteFunctions } from 'n8n-core';

import {
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	JsonObject,
	NodeCredentialTestResult,
} from 'n8n-workflow';
import { OptionsWithUri } from 'request';
import { crmDescription } from './descriptions/CrmDescription';

import {
	IOdooFilterOperations,
	odooCreate,
	odooDelete,
	odooGet,
	odooGetAll,
	odooGetModelFields,
	odooGetUserID,
	odooUpdate,
} from './GenericFunctions';
import {
	calendarEventDescription,
	crmLeadDescription,
	noteNoteDescription,
	resPartnerDescription,
	stockPickingTypeDescription,
} from './models/OdooModelsDescription';

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
				default: 'contact',
				noDataExpression: true,
				options: [
					{
						name: 'Calendar',
						value: 'calendar',
					},
					{
						name: 'Contact',
						value: 'contact',
					},
					{
						name: 'Crm',
						value: 'crm',
					},
					{
						name: 'Custom Resource',
						value: 'custom',
					},
					{
						name: 'Inventory',
						value: 'inventory',
					},
					{
						name: 'Note',
						value: 'note',
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

			//======================================================================
			{
				displayName: 'Fields To Include',
				name: 'fieldsList',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
					multipleValueButtonText: 'Add Field',
				},
				default: {},
				description: 'Choose fields to be returned',
				placeholder: '',
				displayOptions: {
					show: {
						resource: ['custom'],
						operation: ['get', 'getAll'],
					},
				},
				options: [
					{
						displayName: 'Fields To Be Returnedd',
						name: 'fields',
						values: [
							{
								displayName: 'Choose From List',
								name: 'fromList',
								type: 'boolean',
								default: false,
								description: 'Whether to use options from list',
							},
							{
								displayName: 'Field:',
								name: 'field',
								type: 'string',
								default: '',
								description: 'Enter field name',
								placeholder: '',
								displayOptions: {
									show: {
										fromList: [false],
									},
								},
							},
							{
								displayName: 'Field',
								name: 'field',
								type: 'options',
								default: '',
								noDataExpression: true,
								typeOptions: {
									loadOptionsDependsOn: ['customResource'],
									loadOptionsMethod: 'getModelFields',
								},
								displayOptions: {
									show: {
										fromList: [true],
									},
								},
							},
						],
					},
				],
			},

			//    Descriptions   --------------------------------------------------
			...crmDescription,

			//======================================================================
			// ...noteNoteDescription,
			// ...resPartnerDescription,
			// ...calendarEventDescription,
			// ...crmLeadDescription,
			// ...stockPickingTypeDescription,

			//    Get All   ------------------------------------------------------
			// {
			// 	displayName: 'Filter Results',
			// 	name: 'filterRequest',
			// 	type: 'fixedCollection',
			// 	typeOptions: {
			// 		multipleValues: true,
			// 		multipleValueButtonText: 'Add Filter',
			// 	},
			// 	default: {},
			// 	description: 'Filter request by applying filters',
			// 	placeholder: 'Add condition',
			// 	displayOptions: {
			// 		show: {
			// 			operation: ['getAll'],
			// 		},
			// 	},
			// 	options: [
			// 		{
			// 			name: 'filter',
			// 			displayName: 'Filter',
			// 			values: [
			// 				{
			// 					displayName: 'Field Name',
			// 					name: 'fieldName',
			// 					type: 'string',
			// 					default: '',
			// 					description: 'Specify field name',
			// 					required: true,
			// 				},
			// 				{
			// 					displayName: 'Operator',
			// 					name: 'operator',
			// 					type: 'options',
			// 					default: 'equal',
			// 					description: 'Specify an operator',
			// 					required: true,
			// 					options: [
			// 						{
			// 							name: '!=',
			// 							value: 'notEqual',
			// 						},
			// 						{
			// 							name: '<',
			// 							value: 'lesserThen',
			// 						},
			// 						{
			// 							name: '=',
			// 							value: 'equal',
			// 						},
			// 						{
			// 							name: '=<',
			// 							value: 'lesserOrEqual',
			// 						},
			// 						{
			// 							name: '>',
			// 							value: 'greaterThen',
			// 						},
			// 						{
			// 							name: '>=',
			// 							value: 'greaterOrEqual',
			// 						},
			// 						{
			// 							name: 'Chield Of',
			// 							value: 'childOf',
			// 						},
			// 						{
			// 							name: 'In',
			// 							value: 'in',
			// 						},
			// 						{
			// 							name: 'Like',
			// 							value: 'like',
			// 						},
			// 						{
			// 							name: 'Not In',
			// 							value: 'notIn',
			// 						},
			// 					],
			// 				},
			// 				{
			// 					displayName: 'Value',
			// 					name: 'value',
			// 					type: 'string',
			// 					default: '',
			// 					description: 'Specify value for comparison',
			// 					required: true,
			// 				},
			// 			],
			// 		},
			// 	],
			// },

			//    Update/Create    -----------------------------------------------
			// {
			// 	displayName: 'AddFields',
			// 	name: 'fieldsToCreateOrUpdate',
			// 	type: 'fixedCollection',
			// 	typeOptions: {
			// 		multipleValues: true,
			// 		multipleValueButtonText: 'Add Field',
			// 	},
			// 	default: {},
			// 	description: 'Add field and value',
			// 	placeholder: '',
			// 	displayOptions: {
			// 		show: {
			// 			operation: ['update', 'create'],
			// 		},
			// 	},
			// 	options: [
			// 		{
			// 			displayName: 'Field Record:',
			// 			name: 'fields',
			// 			values: [
			// 				{
			// 					displayName: 'Field Name',
			// 					name: 'fieldName',
			// 					type: 'string',
			// 					default: '',
			// 					required: true,
			// 				},
			// 				{
			// 					displayName: 'New Value',
			// 					name: 'fieldValue',
			// 					type: 'string',
			// 					default: '',
			// 					required: true,
			// 				},
			// 			],
			// 		},
			// 	],
			// },
		],
	};

	methods = {
		loadOptions: {
			async getModelFields(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const customResource = this.getCurrentNodeParameter('customResource') as string;

				const credentials = await this.getCredentials('odooApi');
				const url = credentials?.url as string;
				const username = credentials?.username as string;
				const password = credentials?.password as string;
				const db = (credentials?.db || url.split('//')[1].split('.')[0]) as string;
				const userID = await odooGetUserID.call(this, db, username, password, url);

				const responce = await odooGetModelFields.call(
					this,
					db,
					userID,
					password,
					customResource,
					url,
				);

				const options = Object.values(responce).map((field) => {
					const optionField = field as { [key: string]: string };
					return {
						name: optionField.name,
						value: optionField.name,
						// nodelinter-ignore-next-line
						description: optionField.string.replace(/^./, optionField.string[0].toUpperCase()),
					};
				});

				return options.sort((a, b) => a.name.localeCompare(b.name));
			},
		},
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

				const options: OptionsWithUri = {
					headers: {
						'User-Agent': 'https://n8n.io',
						Connection: 'keep-alive',
						Accept: '*/*',
						'Content-Type': 'application/json',
					},
					method: 'POST',
					body,
					uri: `${credentials?.url}/jsonrpc`,
					json: true,
				};
				try {
					const result = await this.helpers.request!(options);
					console.log(result);
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

		//----------------------------------------------------------------------
		//                            Main loop
		//----------------------------------------------------------------------

		for (let i = 0; i < items.length; i++) {
			try {
				//    Create    ------------------------------------------------------
				if (operation === 'create') {
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					// const fieldsToCreateOrUpdate =
					// 	(processNameValueFields(
					// 		this.getNodeParameter('fieldsToCreateOrUpdate', i) as IDataObject,
					// 	) as IDataObject) || {};
					const fields = { ...additionalFields};

					if (resource === 'crm') {
						const opportunity = this.getNodeParameter('opportunity', i) as string;
						fields['name'] = opportunity;
					}

					console.log(fields);
					responseData = await odooCreate.call(
						this,
						db,
						userID,
						password,
						resource,
						operation,
						url,
						fields,
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
						this.getNodeParameter('items_id', i) as string,
						// this.getNodeParameter('fieldsList', i) as IDataObject,
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
						// this.getNodeParameter('filterRequest', i) as IOdooFilterOperations,
						// this.getNodeParameter('fieldsList', i) as IDataObject,
					);
				}

				//    Update    ------------------------------------------------------
				if (operation === 'update') {
					const additionalFields = this.getNodeParameter('updateFields', i) as IDataObject;
					const fields = { ...additionalFields};

					responseData = await odooUpdate.call(
						this,
						db,
						userID,
						password,
						resource,
						operation,
						url,
						this.getNodeParameter('items_id', i) as string,
						fields,
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
						this.getNodeParameter('items_id', i) as string,
					);
				}

				if (Array.isArray(responseData)) {
					returnData.push.apply(returnData, responseData);
				} else if (responseData !== undefined) {
					returnData.push(responseData);
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: (error as JsonObject).message });
					continue;
				}
				throw error;
			}
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
