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

import { getAccessTokens, haloPSAApiRequest, validateCrendetials } from './GenericFunctions';

import { OptionsWithUri } from 'request';

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
				displayName: 'Resource Server',
				name: 'apiUrl',
				type: 'string',
				default: '',
				placeholder: ' https://your-halo-web-app-url/api',
				required: true,
				description:
					'By default, the Resource server is available at *your Halo Web Applicaiton url*"/api". Each resource then has it\'s own endpoint, e.g Tickets are available at *your Halo Web Applicaiton url*"/api/tickets". Endpoints accept the HTTP GET, POST and DELETE methods depending on the resource that you are accessing.',
			},
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
						name: 'Knowledge Base Article',
						value: 'kbarticle',
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
				displayOptions: {
					show: {
						resource: ['tickets', 'users', 'client'],
					},
				},
				options: [
					{
						name: 'Get All',
						value: 'GET',
					},
					{
						name: 'Create',
						value: 'POST',
					},
					{
						name: 'Delete',
						value: 'DELETE',
					},
				],
				default: 'GET',
			},
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['tickets', 'users', 'client'],
						operation: ['GET'],
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
						resource: ['tickets', 'users', 'client'],
						operation: ['GET'],
						returnAll: [false],
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

		for (let i = 0; i < items.length; i++) {
			try {
				responseData = await haloPSAApiRequest.call(
					this,
					this.getNodeParameter('apiUrl', 0) as string,
					this.getNodeParameter('resource', 0) as string,
					this.getNodeParameter('operation', 0) as string,
					tokens.access_token,
				);

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
