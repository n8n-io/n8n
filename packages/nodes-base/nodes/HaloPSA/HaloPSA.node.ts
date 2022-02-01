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
	clientFields,
	clientOperations,
	siteFields,
	siteOperations,
	ticketFields,
	ticketOperations,
	userFields,
	userOperations
} from './descriptions';

import {
	getAccessTokens,
	haloPSAApiRequest,
	haloPSAApiRequestAllItems,
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
				default: 'client',
				required: true,
			},
			...clientOperations,
			...clientFields,
			...ticketOperations,
			...ticketFields,
			...siteOperations,
			...siteFields,
			...userOperations,
			...userFields,
		],
	};

	methods = {
		loadOptions: {
			async getHaloPSASites(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const tokens = await getAccessTokens.call(this);

				const response = await haloPSAApiRequestAllItems.call(
					this,
					'sites',
					'GET',
					'/site',
					tokens.access_token,
				) as IDataObject[];

				const options = response.map((site) => {
					return {
						name: site.clientsite_name as string,
						value: site.id as number,
					};
				});

				return options.sort((a, b) => a.name.localeCompare(b.name));
			},

			async getHaloPSAAgents(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const tokens = await getAccessTokens.call(this);

				const response = await haloPSAApiRequestAllItems.call(
					this,
					'agents',
					'GET',
					'/agent',
					tokens.access_token,
				) as IDataObject[];

				const options = response.map((agent) => {
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

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		//====================================================================
		//                        Main Loop
		//====================================================================

		for (let i = 0; i < items.length; i++) {
			try {

				if (resource === 'client') {
					if (operation === 'create') {
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						const name = this.getNodeParameter('clientName', i) as string;
						const body: IDataObject = {
							name,
							...additionalFields,
						};

						responseData = await haloPSAApiRequest.call(
							this,
							'POST',
							'/client',
							tokens.access_token,
							[body],
						);
					}

					if (operation === 'delete') {
						const clientId = this.getNodeParameter('clientId', i) as string;

						responseData = await haloPSAApiRequest.call(
							this,
							'DELETE',
							`/client/${clientId}`,
							tokens.access_token,
						);
					}

					if (operation === 'get') {
						const clientId = this.getNodeParameter('clientId', i) as string;
						responseData = await haloPSAApiRequest.call(
							this,
							'GET',
							`/client/${clientId}`,
							tokens.access_token,
						);
					}

					if (operation === 'getAll') {
						const filters = this.getNodeParameter('filters', i) as IDataObject;
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						const qs: IDataObject = {};
						Object.assign(qs, filters);
						if (returnAll) {
							responseData = await haloPSAApiRequestAllItems.call(
								this,
								'clients',
								'GET',
								`/client`,
								tokens.access_token,
								{},
								qs,
							);
						} else {
							const limit = this.getNodeParameter('limit', i) as number;
							qs.count = limit;
							const { clients } = await haloPSAApiRequest.call(
								this,
								'GET',
								`/client`,
								tokens.access_token,
								{},
								qs,
							);
							responseData = clients;
						}
					}

					if (operation === 'update') {
						const clientId = this.getNodeParameter('clientId', i) as IDataObject;
						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;
						const body: IDataObject = {
							id: clientId,
							...updateFields,
						};

						responseData = await haloPSAApiRequest.call(
							this,
							'POST',
							'/client',
							tokens.access_token,
							[body],
						);
					}
				}

				if (resource === 'site') {
					if (operation === 'create') {
						const name = this.getNodeParameter('siteName', i) as string;
						const clientId = this.getNodeParameter('clientId', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						const body: IDataObject = {
							name,
							client_id: clientId,
							...additionalFields,
						};

						responseData = await haloPSAApiRequest.call(
							this,
							'POST',
							'/site',
							tokens.access_token,
							[body],
						);
					}

					if (operation === 'delete') {
						const siteId = this.getNodeParameter('siteId', i) as string;
						responseData = await haloPSAApiRequest.call(
							this,
							'DELETE',
							`/site/${siteId}`,
							tokens.access_token,
						);
					}

					if (operation === 'get') {
						const siteId = this.getNodeParameter('siteId', i) as string;
						responseData = await haloPSAApiRequest.call(
							this,
							'GET',
							`/site/${siteId}`,
							tokens.access_token,
						);
					}

					if (operation === 'getAll') {
						const filters = this.getNodeParameter('filters', i) as IDataObject;
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						const qs: IDataObject = {};
						Object.assign(qs, filters);
						if (returnAll) {
							responseData = await haloPSAApiRequestAllItems.call(
								this,
								'sites',
								'GET',
								`/site`,
								tokens.access_token,
								{},
								qs,
							);
						} else {
							const limit = this.getNodeParameter('limit', i) as number;
							qs.count = limit;
							const { sites } = await haloPSAApiRequest.call(
								this,
								'GET',
								`/site`,
								tokens.access_token,
								{},
								qs,
							);
							responseData = sites;
						}
					}

					if (operation === 'update') {
						const siteId = this.getNodeParameter('siteId', i) as IDataObject;
						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;
						const body: IDataObject = {
							id: siteId,
							...updateFields,
						};

						responseData = await haloPSAApiRequest.call(
							this,
							'POST',
							'/site',
							tokens.access_token,
							[body],
						);
					}
				}

				if (resource === 'ticket') {
					if (operation === 'create') {
						const summary = this.getNodeParameter('summary', i) as string;
						const details = this.getNodeParameter('details', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						const body: IDataObject = {
							summary,
							details,
							...additionalFields,
						};

						responseData = await haloPSAApiRequest.call(
							this,
							'POST',
							'/tickets',
							tokens.access_token,
							[body],
						);
					}

					if (operation === 'delete') {
						const ticketId = this.getNodeParameter('ticketId', i) as string;
						responseData = await haloPSAApiRequest.call(
							this,
							'DELETE',
							`/tickets/${ticketId}`,
							tokens.access_token,
						);
					}

					if (operation === 'get') {
						const ticketId = this.getNodeParameter('ticketId', i) as string;
						responseData = await haloPSAApiRequest.call(
							this,
							'GET',
							`/tickets/${ticketId}`,
							tokens.access_token,
						);
					}

					if (operation === 'getAll') {
						const filters = this.getNodeParameter('filters', i) as IDataObject;
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						const qs: IDataObject = {};
						Object.assign(qs, filters);
						if (returnAll) {
							responseData = await haloPSAApiRequestAllItems.call(
								this,
								'tickets',
								'GET',
								`/tickets`,
								tokens.access_token,
								{},
								qs,
							);
						} else {
							const limit = this.getNodeParameter('limit', i) as number;
							qs.count = limit;
							const { tickets } = await haloPSAApiRequest.call(
								this,
								'GET',
								`/tickets`,
								tokens.access_token,
								{},
								qs,
							);
							responseData = tickets;
						}
					}

					if (operation === 'update') {
						const ticketId = this.getNodeParameter('ticketId', i) as IDataObject;
						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;
						const body: IDataObject = {
							id: ticketId,
							...updateFields,
						};

						responseData = await haloPSAApiRequest.call(
							this,
							'POST',
							'/tickets',
							tokens.access_token,
							[body],
						);
					}
				}

				if (resource === 'user') {
					if (operation === 'create') {
						const name = this.getNodeParameter('userName', i) as string;
						const siteId = this.getNodeParameter('siteId', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						const body: IDataObject = {
							name,
							site_id: siteId,
							...additionalFields,
						};

						responseData = await haloPSAApiRequest.call(
							this,
							'POST',
							'/users',
							tokens.access_token,
							[body],
						);
					}

					if (operation === 'delete') {
						const userId = this.getNodeParameter('userId', i) as string;
						responseData = await haloPSAApiRequest.call(
							this,
							'DELETE',
							`/users/${userId}`,
							tokens.access_token,
						);
					}

					if (operation === 'get') {
						const userId = this.getNodeParameter('userId', i) as string;
						responseData = await haloPSAApiRequest.call(
							this,
							'GET',
							`/users/${userId}`,
							tokens.access_token,
						);
					}

					if (operation === 'getAll') {
						const filters = this.getNodeParameter('filters', i) as IDataObject;
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						const qs: IDataObject = {};
						Object.assign(qs, filters);
						if (returnAll) {
							responseData = await haloPSAApiRequestAllItems.call(
								this,
								'users',
								'GET',
								`/users`,
								tokens.access_token,
								{},
								qs,
							);
						} else {
							const limit = this.getNodeParameter('limit', i) as number;
							qs.count = limit;
							const { users } = await haloPSAApiRequest.call(
								this,
								'GET',
								`/users`,
								tokens.access_token,
								{},
								qs,
							);
							responseData = users;
						}
					}

					if (operation === 'update') {
						const userId = this.getNodeParameter('userId', i) as IDataObject;
						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;
						const body: IDataObject = {
							id: userId,
							...updateFields,
						};

						responseData = await haloPSAApiRequest.call(
							this,
							'POST',
							'/users',
							tokens.access_token,
							[body],
						);
					}
				}

				if (Array.isArray(responseData)) {
					returnData.push.apply(returnData, responseData);
				} else if (responseData !== undefined) {
					returnData.push(responseData);
				}
			} catch (error) {
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
