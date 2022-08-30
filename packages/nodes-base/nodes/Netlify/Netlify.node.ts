import { IExecuteFunctions } from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { netlifyApiRequest, netlifyRequestAllItems } from './GenericFunctions';

import { deployFields, deployOperations } from './DeployDescription';

import { siteFields, siteOperations } from './SiteDescription';

export class Netlify implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Netlify',
		name: 'netlify',
		icon: 'file:netlify.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Netlify API',
		defaults: {
			name: 'Netlify',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'netlifyApi',
				required: true,
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
						name: 'Deploy',
						value: 'deploy',
					},
					{
						name: 'Site',
						value: 'site',
					},
				],
				default: 'deploy',
				required: true,
			},
			...deployOperations,
			...deployFields,
			...siteOperations,
			...siteFields,
		],
	};

	methods = {
		loadOptions: {
			async getSites(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const sites = await netlifyApiRequest.call(this, 'GET', '/sites');
				for (const site of sites) {
					returnData.push({
						name: site.name,
						value: site.site_id,
					});
				}
				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const length = items.length;
		let responseData;
		const returnData: IDataObject[] = [];
		const qs: IDataObject = {};
		const body: IDataObject = {};
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < length; i++) {
			try {
				if (resource === 'deploy') {
					if (operation === 'cancel') {
						const deployId = this.getNodeParameter('deployId', i);
						responseData = await netlifyApiRequest.call(
							this,
							'POST',
							`/deploys/${deployId}/cancel`,
							body,
							qs,
						);
					}

					if (operation === 'create') {
						const siteId = this.getNodeParameter('siteId', i);
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						Object.assign(body, additionalFields);

						if (body.title) {
							qs.title = body.title;
							delete body.title;
						}

						responseData = await netlifyApiRequest.call(
							this,
							'POST',
							`/sites/${siteId}/deploys`,
							body,
							qs,
						);
					}

					if (operation === 'get') {
						const siteId = this.getNodeParameter('siteId', i);
						const deployId = this.getNodeParameter('deployId', i);
						responseData = await netlifyApiRequest.call(
							this,
							'GET',
							`/sites/${siteId}/deploys/${deployId}`,
							body,
							qs,
						);
					}

					if (operation === 'getAll') {
						const siteId = this.getNodeParameter('siteId', i);
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						if (returnAll === true) {
							responseData = await netlifyRequestAllItems.call(
								this,
								'GET',
								`/sites/${siteId}/deploys`,
							);
						} else {
							const limit = this.getNodeParameter('limit', i) as number;
							responseData = await netlifyApiRequest.call(
								this,
								'GET',
								`/sites/${siteId}/deploys`,
								{},
								{ per_page: limit },
							);
						}
					}
				}
				if (resource === 'site') {
					if (operation === 'delete') {
						const siteId = this.getNodeParameter('siteId', i);
						responseData = await netlifyApiRequest.call(this, 'DELETE', `/sites/${siteId}`);
					}

					if (operation === 'get') {
						const siteId = this.getNodeParameter('siteId', i);
						responseData = await netlifyApiRequest.call(this, 'GET', `/sites/${siteId}`);
					}

					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						if (returnAll === true) {
							responseData = await netlifyRequestAllItems.call(
								this,
								'GET',
								`/sites`,
								{},
								{ filter: 'all' },
							);
						} else {
							const limit = this.getNodeParameter('limit', i) as number;
							responseData = await netlifyApiRequest.call(
								this,
								'GET',
								`/sites`,
								{},
								{ filter: 'all', per_page: limit },
							);
						}
					}
				}
				if (Array.isArray(responseData)) {
					returnData.push.apply(returnData, responseData as IDataObject[]);
				} else if (responseData !== undefined) {
					returnData.push(responseData as IDataObject);
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
