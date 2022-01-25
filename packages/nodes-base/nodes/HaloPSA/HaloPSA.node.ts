import {
	IExecuteFunctions
} from 'n8n-core';

import {
	ICredentialDataDecryptedObject,
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
import {
	clientDescription
} from './descriptions/ClientDescription';
import {
	invoiceDescription
} from './descriptions/InvoiceDescription';
import {
	siteDescription
} from './descriptions/SiteDescription';
import {
	ticketDescription
} from './descriptions/TicketDescription';
import {
	userDescription
} from './descriptions/UserDescription';

import {
	getAccessTokens,
	haloPSAApiRequest,
	validateCrendetials
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
					// {
					// 	name: 'Invoice',
					// 	value: 'invoice',
					// },
					{
						name: 'Site',
						value: 'site',
					},
					{
						name: 'Ticket',
						value: 'ticket',
					},
					{
						name: 'User',
						value: 'user',
					},
				],
				default: 'ticket',
				required: true,
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
				type: 'string',
				default: '',
				description: 'Specify item ID',
				displayOptions: {
					show: {
						operation: ['get', 'update', 'delete'],
						resource: [
							'client',
							'invoice',
							'site',
							'ticket',
							'user',
						],
					},
				},
			},

			// Descriptions -------------------------------------------------------------
			...ticketDescription,
			// ...invoiceDescription,
			...userDescription,
			...clientDescription,
			...siteDescription,

			// Delete ----------------------------------------------------------------
			{
				displayName: 'The Reason For Deleting Item',
				name: 'reasonForDeletion',
				type: 'string',
				default: '',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
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
		loadOptions: {
			async getHaloPSASites(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const credentials = await this.getCredentials('haloPSAApi');
				const tokens = await getAccessTokens.call(this);

				const responce = (await haloPSAApiRequest.call(
					this,
					credentials?.resourceApiUrl as string,
					'site',
					'GET',
					tokens.access_token,
				)) as IDataObject[];

				const options = responce.map((site) => {
					return {
						name: site.clientsite_name as string,
						value: site.id as number,
					};
				});

				return options.sort((a, b) => a.name.localeCompare(b.name));
			},

			async getHaloPSAClients(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const credentials = await this.getCredentials('haloPSAApi');
				const tokens = await getAccessTokens.call(this);

				const responce = (await haloPSAApiRequest.call(
					this,
					credentials?.resourceApiUrl as string,
					'client',
					'GET',
					tokens.access_token,
				)) as IDataObject[];

				const options = responce.map((client) => {
					return {
						name: client.name as string,
						value: client.id as number,
					};
				});

				return options.sort((a, b) => a.name.localeCompare(b.name));
			},

			async getHaloPSAItems(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const credentials = await this.getCredentials('haloPSAApi');
				const tokens = await getAccessTokens.call(this);

				const responce = (await haloPSAApiRequest.call(
					this,
					credentials?.resourceApiUrl as string,
					'item',
					'GET',
					tokens.access_token,
				)) as IDataObject[];

				const options = responce.map((item) => {
					return {
						name: item.name as string,
						value: item.id as number,
					};
				});

				return options.sort((a, b) => a.name.localeCompare(b.name));
			},

			async getHaloPSAAgents(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const credentials = await this.getCredentials('haloPSAApi');
				const tokens = await getAccessTokens.call(this);

				const responce = (await haloPSAApiRequest.call(
					this,
					credentials?.resourceApiUrl as string,
					'agent',
					'GET',
					tokens.access_token,
				)) as IDataObject[];

				const options = responce.map((agent) => {
					return {
						name: agent.name as string,
						value: agent.id as number,
					};
				});

				return options.sort((a, b) => a.name.localeCompare(b.name));
			},
		},

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
						message: (error as JsonObject).message as string,
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

		let resource = this.getNodeParameter('resource', 0) as string;
		if(resource === 'ticket') {
			resource = 'tickets';
		}
		if(resource === 'user') {
			resource = 'users';
		}

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
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					const item: IDataObject = { ...additionalFields };

					if (resource === 'ticket') {
						const summary = this.getNodeParameter('summary', i) as string;
						item['summary'] = summary;
						const details = this.getNodeParameter('details', i) as string;
						item['details'] = details;
					}

					if (resource === 'client') {
						const name = this.getNodeParameter('clientName', i) as string;
						item['name'] = name;
					}

					if (resource === 'user') {
						const name = this.getNodeParameter('userName', i) as string;
						item['name'] = name;
						const site = this.getNodeParameter('sitesList', i) as string;
						item['site_id'] = site;
					}

					if (resource === 'site') {
						const siteName = this.getNodeParameter('siteName', i) as string;
						item['name'] = siteName;
						const client = this.getNodeParameter('clientsList', i) as number;
						item['client_id'] = client;
					}

					if (resource === 'invoice') {
						const client = this.getNodeParameter('clientsList', i) as number;
						item['client_id'] = client;
						const invoiceDate = this.getNodeParameter('invoiceDate', i) as number;
						item['invoice_date'] = invoiceDate;
						const itemsList = this.getNodeParameter('itemsList', i) as IDataObject;
						const items = [];

						for (const entry of itemsList.items as IDataObject[]) {
							const response = await haloPSAApiRequest.call(
								this,
								resourceApiUrl,
								'item',
								'GET',
								tokens.access_token,
								entry.item_id as string,
							);
							const quantity = entry.quantity as number;
							const price = (response as IDataObject).baseprice as number;
							items.push({
								_itemid: (response as IDataObject).id,
								qty_order: quantity,
								unit_price: price,
								prorata_quantity: quantity,
								prorata_unit_price: price,
								calculate_price_from_assets: true,
							});
						}

						item['lines'] = items;
					}

					const body = [item];
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
					const itemID = this.getNodeParameter('item_id', i) as string;
					const reasonForDeletion = this.getNodeParameter('reasonForDeletion', i) as string;
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
					const itemID = this.getNodeParameter('item_id', i) as string;
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
					let count;
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;
					if (returnAll) {
						count = {};
					} else {
						const limit = this.getNodeParameter('limit', i) as number;
						count = { count: limit };
					}
					responseData = await haloPSAApiRequest.call(
						this,
						resourceApiUrl,
						resource,
						'GET',
						tokens.access_token,
						'',
						{},
						count,
					);
				}

				// Update ----------------------------------------------------
				if (operation === 'update') {
					const itemID = this.getNodeParameter('item_id', i) as string;
					const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

					const body = [{ id: +itemID, ...updateFields }];
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
