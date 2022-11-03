import { IExecuteFunctions } from 'n8n-core';

import {
	ICredentialDataDecryptedObject,
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IDataObject,
	ILoadOptionsFunctions,
	INodeCredentialTestResult,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';

import {
	clientFields,
	clientOperations,
	siteFields,
	siteOperations,
	ticketFields,
	ticketOperations,
	userFields,
	userOperations,
} from './descriptions';

import {
	getAccessTokens,
	haloPSAApiRequest,
	haloPSAApiRequestAllItems,
	qsSetStatus,
	simplifyHaloPSAGetOutput,
	validateCredentials,
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

				const response = (await haloPSAApiRequestAllItems.call(
					this,
					'sites',
					'GET',
					'/site',
					tokens.access_token,
				)) as IDataObject[];

				const options = response.map((site) => {
					return {
						name: site.clientsite_name as string,
						value: site.id as number,
					};
				});

				return options.sort((a, b) => a.name.localeCompare(b.name));
			},

			async getHaloPSAClients(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const tokens = await getAccessTokens.call(this);

				const response = (await haloPSAApiRequestAllItems.call(
					this,
					'clients',
					'GET',
					'/Client',
					tokens.access_token,
				)) as IDataObject[];

				const options = response.map((client) => {
					return {
						name: client.name as string,
						value: client.id as number,
					};
				});

				return options.sort((a, b) => a.name.localeCompare(b.name));
			},

			async getHaloPSATicketsTypes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const tokens = await getAccessTokens.call(this);

				const response = (await haloPSAApiRequest.call(
					this,
					'GET',
					`/TicketType`,
					tokens.access_token,
					{},
				)) as IDataObject[];

				const options = response.map((ticket) => {
					return {
						name: ticket.name as string,
						value: ticket.id as number,
					};
				});

				return options
					.filter((ticket) => {
						if (
							// folowing types throws error 400 - "CODE:APP03/2 Please select the CAB members to approve"
							ticket.name.includes('Request') ||
							ticket.name.includes('Offboarding') ||
							ticket.name.includes('Onboarding') ||
							ticket.name.includes('Other Hardware') ||
							ticket.name.includes('Software Change')
						) {
							return false;
						}
						return true;
					})
					.sort((a, b) => a.name.localeCompare(b.name));
			},

			async getHaloPSAAgents(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const tokens = await getAccessTokens.call(this);

				const response = (await haloPSAApiRequest.call(
					this,
					'GET',
					`/agent`,
					tokens.access_token,
					{},
				)) as IDataObject[];

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
			): Promise<INodeCredentialTestResult> {
				try {
					await validateCredentials.call(this, credential.data as ICredentialDataDecryptedObject);
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
		const returnData: INodeExecutionData[] = [];
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
					const simplifiedOutput = ['id', 'name', 'notes', 'is_vip', 'website'];

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
						// const reasign = this.getNodeParameter('reasign', i) as boolean;
						// if (reasign) {
						// 	const reasigmentCliendId = this.getNodeParameter('reasigmentCliendId', i) as string;
						// 	await reasignTickets.call(this, clientId, reasigmentCliendId, tokens.access_token);
						// }

						responseData = await haloPSAApiRequest.call(
							this,
							'DELETE',
							`/client/${clientId}`,
							tokens.access_token,
						);
					}

					if (operation === 'get') {
						const clientId = this.getNodeParameter('clientId', i) as string;
						const simplify = this.getNodeParameter('simplify', i) as boolean;
						let response;
						response = await haloPSAApiRequest.call(
							this,
							'GET',
							`/client/${clientId}`,
							tokens.access_token,
						);
						responseData = simplify
							? simplifyHaloPSAGetOutput([response], simplifiedOutput)
							: response;
					}

					if (operation === 'getAll') {
						const filters = this.getNodeParameter('filters', i) as IDataObject;
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						const simplify = this.getNodeParameter('simplify', i) as boolean;
						const qs: IDataObject = {};
						let response;

						Object.assign(qs, filters, qsSetStatus(filters.activeStatus as string));
						if (returnAll) {
							response = await haloPSAApiRequestAllItems.call(
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
							response = clients;
						}
						responseData = simplify
							? simplifyHaloPSAGetOutput(response, simplifiedOutput)
							: response;
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
					const simplifiedOutput = [
						'id',
						'name',
						'client_id',
						'maincontact_name',
						'notes',
						'phonenumber',
					];

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
						const simplify = this.getNodeParameter('simplify', i) as boolean;
						let response;
						response = await haloPSAApiRequest.call(
							this,
							'GET',
							`/site/${siteId}`,
							tokens.access_token,
						);
						responseData = simplify
							? simplifyHaloPSAGetOutput([response], simplifiedOutput)
							: response;
					}

					if (operation === 'getAll') {
						const filters = this.getNodeParameter('filters', i) as IDataObject;
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						const simplify = this.getNodeParameter('simplify', i) as boolean;
						const qs: IDataObject = {};
						let response;

						Object.assign(qs, filters, qsSetStatus(filters.activeStatus as string));
						if (returnAll) {
							response = await haloPSAApiRequestAllItems.call(
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
							response = sites;
						}
						responseData = simplify
							? simplifyHaloPSAGetOutput(response, simplifiedOutput)
							: response;
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
					const simplifiedOutput = [
						'id',
						'summary',
						'details',
						'agent_id',
						'startdate',
						'targetdate',
					];

					if (operation === 'create') {
						const summary = this.getNodeParameter('summary', i) as string;
						const details = this.getNodeParameter('details', i) as string;
						const ticketType = this.getNodeParameter('ticketType', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						const body: IDataObject = {
							tickettype_id: ticketType,
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
						const simplify = this.getNodeParameter('simplify', i) as boolean;
						let response;
						response = await haloPSAApiRequest.call(
							this,
							'GET',
							`/tickets/${ticketId}`,
							tokens.access_token,
						);
						responseData = simplify
							? simplifyHaloPSAGetOutput([response], simplifiedOutput)
							: response;
					}

					if (operation === 'getAll') {
						const filters = this.getNodeParameter('filters', i) as IDataObject;
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						const simplify = this.getNodeParameter('simplify', i) as boolean;
						const qs: IDataObject = {};
						let response;

						Object.assign(qs, filters, qsSetStatus(filters.activeStatus as string));
						if (returnAll) {
							response = await haloPSAApiRequestAllItems.call(
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
							response = tickets;
						}
						responseData = simplify
							? simplifyHaloPSAGetOutput(response, simplifiedOutput)
							: response;
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
					const simplifiedOutput = [
						'id',
						'name',
						'site_id',
						'emailaddress',
						'notes',
						'surname',
						'inactive',
					];

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
						const simplify = this.getNodeParameter('simplify', i) as boolean;
						let response;
						response = await haloPSAApiRequest.call(
							this,
							'GET',
							`/users/${userId}`,
							tokens.access_token,
						);
						responseData = simplify
							? simplifyHaloPSAGetOutput([response], simplifiedOutput)
							: response;
					}

					if (operation === 'getAll') {
						const filters = this.getNodeParameter('filters', i) as IDataObject;
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						const simplify = this.getNodeParameter('simplify', i) as boolean;
						const qs: IDataObject = {};
						let response;

						Object.assign(qs, filters, qsSetStatus(filters.activeStatus as string));
						if (returnAll) {
							response = await haloPSAApiRequestAllItems.call(
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
							response = users;
						}
						responseData = simplify
							? simplifyHaloPSAGetOutput(response, simplifiedOutput)
							: response;
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

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData),
					{ itemData: { item: i } },
				);

				returnData.push(...executionData);
			} catch (error) {
				if (this.continueOnFail()) {
					const executionErrorData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray({ error: error.message }),
						{ itemData: { item: i } },
					);
					returnData.push(...executionErrorData);
					continue;
				}
				throw error;
			}
		}

		return this.prepareOutputData(returnData);
	}
}
