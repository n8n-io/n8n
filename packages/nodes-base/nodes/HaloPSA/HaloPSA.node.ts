import { IExecuteFunctions } from 'n8n-core';

import {
	ICredentialDataDecryptedObject,
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
	NodeCredentialTestResult,
} from 'n8n-workflow';

import {
	getAccessTokens,
	haloPSAApiRequest,
	processFields,
	validateCrendetials,
} from './GenericFunctions';

export class HaloPSA implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'HaloPSA',
		name: 'haloPSA',
		icon: 'file:halopsa.svg',
		group: ['input'],
		version: 1,
		description: 'Consume HaloPSA API',
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		defaults: {
			name: 'HaloPSA',
			color: '#fd314e',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'haloPSAApi',
				required: true,
				testedBy: 'haloPSAApiCredentialTest',
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Client',
						value: 'client',
					},
					{
						name: 'Contract',
						value: 'clientcontract',
					},
					{
						name: 'Invoice',
						value: 'invoice',
					},
					{
						name: 'Opportunitie',
						value: 'opportunities',
					},
					{
						name: 'Project',
						value: 'projects',
					},
					{
						name: 'Quotation',
						value: 'quotation',
					},
					{
						name: 'Report',
						value: 'report',
					},
					{
						name: 'Site',
						value: 'site',
					},
					{
						name: 'Supplier',
						value: 'supplier',
					},
					{
						name: 'Ticket',
						value: 'tickets',
					},
					{
						name: 'Users',
						value: 'users',
					},
				],
				default: 'tickets',
				required: true,
				description: 'Resource to consume',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Create',
						value: 'create',
					},
					{
						name: 'Delete',
						value: 'delete',
					},
					{
						name: 'Get',
						value: 'get',
					},
					{
						name: 'Get All',
						value: 'getAll',
					},
					{
						name: 'Update',
						value: 'update',
					},
				],
				default: 'getAll',
			},

			// Get, Update, Delete ----------------------------------------------------
			{
				displayName: 'Item ID',
				name: 'item_id',
				type: 'number',
				typeOptions: {
					minValue: 0,
					numberStepSize: 1,
				},
				default: 0,
				description: 'Specify item ID',
				displayOptions: {
					show: {
						operation: ['get', 'update', 'delete'],
					},
				},
			},

			// Create, Update --------------------------------------------------------
			{
				displayName: 'Add Field',
				name: 'fieldsToCreateOrUpdate',
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
						operation: ['update', 'create'],
					},
				},
				options: [
					{
						displayName: 'Field:',
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

			// Delete ----------------------------------------------------------------
			{
				displayName: 'The Reason For Deleting Item',
				name: 'reasonForDeletion',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						operation: ['delete'],
					},
				},
			},

			// Get All ----------------------------------------------------------------
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				displayOptions: {
					show: {
						operation: ['getAll'],
					},
				},
				default: false,
				description: 'Whether to return all results or only up to a given limit',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				default: 50,
				description: 'Max number of results to return',
				displayOptions: {
					show: {
						returnAll: [false],
						operation: ['getAll'],
					},
				},
				typeOptions: {
					minValue: 1,
					maxValue: 1000,
				},
			},
		],
	};

	methods = {
		credentialTest: {
			async haloPSAApiCredentialTest(
				this: ICredentialTestFunctions,
				credential: ICredentialsDecrypted,
			): Promise<NodeCredentialTestResult> {
				try {
					await validateCrendetials.call(this, credential.data as ICredentialDataDecryptedObject);
				} catch (error) {
					return {
						status: 'Error',
						message: 'The API Key included in the request is invalid',
					};
				}
				return {
					status: 'OK',
					message: 'Connection successful!',
				};
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		let responseData;

		const tokens = await getAccessTokens.call(this);

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		const resourceApiUrl = ((await this.getCredentials('haloPSAApi')) as IDataObject)
			.resourceApiUrl as string;

		//====================================================================
		//                        Main Loop
		//====================================================================

		for (let i = 0; i < items.length; i++) {
			try {
				// Create ----------------------------------------------------
				if (operation === 'create') {
					const data = this.getNodeParameter('fieldsToCreateOrUpdate', 0) as IDataObject;
					const body = [processFields(data)];
					responseData = await haloPSAApiRequest.call(
						this,
						resourceApiUrl,
						resource,
						'POST',
						tokens.access_token,
						'',
						body,
					);
				}
				// Delete ----------------------------------------------------
				if (operation === 'delete') {
					const itemID = this.getNodeParameter('item_id', 0) as string;
					const reasonForDeletion = this.getNodeParameter('reasonForDeletion', 0) as string;
					responseData = await haloPSAApiRequest.call(
						this,
						resourceApiUrl,
						resource,
						'DELETE',
						tokens.access_token,
						itemID,
						{},
						{ reason: reasonForDeletion },
					);
				}
				// Get -------------------------------------------------------
				if (operation === 'get') {
					const itemID = this.getNodeParameter('item_id', 0) as string;
					responseData = await haloPSAApiRequest.call(
						this,
						resourceApiUrl,
						resource,
						'GET',
						tokens.access_token,
						itemID,
					);
				}
				// Get All ---------------------------------------------------
				if (operation === 'getAll') {
					responseData = await haloPSAApiRequest.call(
						this,
						resourceApiUrl,
						resource,
						'GET',
						tokens.access_token,
					);
				}
				// Update ----------------------------------------------------
				if (operation === 'update') {
					const itemID = this.getNodeParameter('item_id', 0) as string;
					const data = this.getNodeParameter('fieldsToCreateOrUpdate', 0) as IDataObject;
					const body = [{ id: +itemID, ...processFields(data) }];
					responseData = await haloPSAApiRequest.call(
						this,
						resourceApiUrl,
						resource,
						'POST',
						tokens.access_token,
						'',
						body,
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
