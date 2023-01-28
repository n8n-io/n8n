import type { IExecuteFunctions } from 'n8n-core';

import type {
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IDataObject,
	ILoadOptionsFunctions,
	INodeCredentialTestResult,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { configOperations } from './ConfigDescription';

import { serviceFields, serviceOperations } from './ServiceDescription';

import { stateFields, stateOperations } from './StateDescription';

import { eventFields, eventOperations } from './EventDescription';

import { logFields, logOperations } from './LogDescription';

import { templateFields, templateOperations } from './TemplateDescription';

import { historyFields, historyOperations } from './HistoryDescription';

import { cameraProxyFields, cameraProxyOperations } from './CameraProxyDescription';

import {
	getHomeAssistantEntities,
	getHomeAssistantServices,
	homeAssistantApiRequest,
} from './GenericFunctions';

export class HomeAssistant implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Home Assistant',
		name: 'homeAssistant',
		icon: 'file:homeAssistant.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Home Assistant API',
		defaults: {
			name: 'Home Assistant',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'homeAssistantApi',
				required: true,
				testedBy: 'homeAssistantApiTest',
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
						name: 'Camera Proxy',
						value: 'cameraProxy',
					},
					{
						name: 'Config',
						value: 'config',
					},
					{
						name: 'Event',
						value: 'event',
					},
					// {
					// 	name: 'History',
					// 	value: 'history',
					// },
					{
						name: 'Log',
						value: 'log',
					},
					{
						name: 'Service',
						value: 'service',
					},
					{
						name: 'State',
						value: 'state',
					},
					{
						name: 'Template',
						value: 'template',
					},
				],
				default: 'config',
			},
			...cameraProxyOperations,
			...cameraProxyFields,
			...configOperations,
			...eventOperations,
			...eventFields,
			...historyOperations,
			...historyFields,
			...logOperations,
			...logFields,
			...serviceOperations,
			...serviceFields,
			...stateOperations,
			...stateFields,
			...templateOperations,
			...templateFields,
		],
	};

	methods = {
		credentialTest: {
			async homeAssistantApiTest(
				this: ICredentialTestFunctions,
				credential: ICredentialsDecrypted,
			): Promise<INodeCredentialTestResult> {
				const credentials = credential.data;
				const options = {
					method: 'GET',
					headers: {
						Authorization: `Bearer ${credentials!.accessToken}`,
					},
					uri: `${credentials!.ssl === true ? 'https' : 'http'}://${credentials!.host}:${
						credentials!.port || '8123'
					}/api/`,
					json: true,
					timeout: 5000,
				};
				try {
					const response = await this.helpers.request(options);
					if (!response.message) {
						return {
							status: 'Error',
							message: `Token is not valid: ${response.error}`,
						};
					}
				} catch (error) {
					return {
						status: 'Error',
						message: `${
							error.statusCode === 401 ? 'Token is' : 'Settings are'
						} not valid: ${error}`,
					};
				}

				return {
					status: 'OK',
					message: 'Authentication successful!',
				};
			},
		},

		loadOptions: {
			async getAllEntities(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return getHomeAssistantEntities.call(this);
			},
			async getCameraEntities(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return getHomeAssistantEntities.call(this, 'camera');
			},
			async getDomains(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return getHomeAssistantServices.call(this);
			},
			async getDomainServices(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const currentDomain = this.getCurrentNodeParameter('domain') as string;
				if (currentDomain) {
					return getHomeAssistantServices.call(this, currentDomain);
				} else {
					return [];
				}
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = items.length;
		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);
		const qs: IDataObject = {};
		let responseData;
		for (let i = 0; i < length; i++) {
			try {
				if (resource === 'config') {
					if (operation === 'get') {
						responseData = await homeAssistantApiRequest.call(this, 'GET', '/config');
					} else if (operation === 'check') {
						responseData = await homeAssistantApiRequest.call(
							this,
							'POST',
							'/config/core/check_config',
						);
					}
				} else if (resource === 'service') {
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i);
						responseData = (await homeAssistantApiRequest.call(
							this,
							'GET',
							'/services',
						)) as IDataObject[];
						if (!returnAll) {
							const limit = this.getNodeParameter('limit', i);
							responseData = responseData.slice(0, limit);
						}
					} else if (operation === 'call') {
						const domain = this.getNodeParameter('domain', i) as string;
						const service = this.getNodeParameter('service', i) as string;
						const serviceAttributes = this.getNodeParameter('serviceAttributes', i) as {
							attributes: IDataObject[];
						};

						const body: IDataObject = {};

						if (Object.entries(serviceAttributes).length) {
							if (serviceAttributes.attributes !== undefined) {
								serviceAttributes.attributes.map((attribute) => {
									// @ts-ignore
									body[attribute.name as string] = attribute.value;
								});
							}
						}

						responseData = await homeAssistantApiRequest.call(
							this,
							'POST',
							`/services/${domain}/${service}`,
							body,
						);
						if (Array.isArray(responseData) && responseData.length === 0) {
							responseData = {};
						}
					}
				} else if (resource === 'state') {
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i);
						responseData = (await homeAssistantApiRequest.call(
							this,
							'GET',
							'/states',
						)) as IDataObject[];
						if (!returnAll) {
							const limit = this.getNodeParameter('limit', i);
							responseData = responseData.slice(0, limit);
						}
					} else if (operation === 'get') {
						const entityId = this.getNodeParameter('entityId', i) as string;
						responseData = await homeAssistantApiRequest.call(this, 'GET', `/states/${entityId}`);
					} else if (operation === 'upsert') {
						const entityId = this.getNodeParameter('entityId', i) as string;
						const state = this.getNodeParameter('state', i) as string;
						const stateAttributes = this.getNodeParameter('stateAttributes', i) as {
							attributes: IDataObject[];
						};

						const body = {
							state,
							attributes: {},
						};

						if (Object.entries(stateAttributes).length) {
							if (stateAttributes.attributes !== undefined) {
								stateAttributes.attributes.map((attribute) => {
									// @ts-ignore
									body.attributes[attribute.name as string] = attribute.value;
								});
							}
						}

						responseData = await homeAssistantApiRequest.call(
							this,
							'POST',
							`/states/${entityId}`,
							body,
						);
					}
				} else if (resource === 'event') {
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i);
						responseData = (await homeAssistantApiRequest.call(
							this,
							'GET',
							'/events',
						)) as IDataObject[];
						if (!returnAll) {
							const limit = this.getNodeParameter('limit', i);
							responseData = responseData.slice(0, limit);
						}
					} else if (operation === 'create') {
						const eventType = this.getNodeParameter('eventType', i) as string;
						const eventAttributes = this.getNodeParameter('eventAttributes', i) as {
							attributes: IDataObject[];
						};

						const body = {};

						if (Object.entries(eventAttributes).length) {
							if (eventAttributes.attributes !== undefined) {
								eventAttributes.attributes.map((attribute) => {
									// @ts-ignore
									body[attribute.name as string] = attribute.value;
								});
							}
						}

						responseData = await homeAssistantApiRequest.call(
							this,
							'POST',
							`/events/${eventType}`,
							body,
						);
					}
				} else if (resource === 'log') {
					if (operation === 'getErroLogs') {
						responseData = await homeAssistantApiRequest.call(this, 'GET', '/error_log');
						if (responseData) {
							responseData = {
								errorLog: responseData,
							};
						}
					} else if (operation === 'getLogbookEntries') {
						const additionalFields = this.getNodeParameter('additionalFields', i);
						let endpoint = '/logbook';

						if (Object.entries(additionalFields).length) {
							if (additionalFields.startTime) {
								endpoint = `/logbook/${additionalFields.startTime}`;
							}
							if (additionalFields.endTime) {
								qs.end_time = additionalFields.endTime;
							}
							if (additionalFields.entityId) {
								qs.entity = additionalFields.entityId;
							}
						}

						responseData = await homeAssistantApiRequest.call(this, 'GET', endpoint, {}, qs);
					}
				} else if (resource === 'template') {
					if (operation === 'create') {
						const body = {
							template: this.getNodeParameter('template', i) as string,
						};
						responseData = await homeAssistantApiRequest.call(this, 'POST', '/template', body);
						if (responseData) {
							responseData = { renderedTemplate: responseData };
						}
					}
				} else if (resource === 'history') {
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i);
						const additionalFields = this.getNodeParameter('additionalFields', i);
						let endpoint = '/history/period';

						if (Object.entries(additionalFields).length) {
							if (additionalFields.startTime) {
								endpoint = `/history/period/${additionalFields.startTime}`;
							}
							if (additionalFields.endTime) {
								qs.end_time = additionalFields.endTime;
							}
							if (additionalFields.entityIds) {
								qs.filter_entity_id = additionalFields.entityIds;
							}
							if (additionalFields.minimalResponse === true) {
								qs.minimal_response = additionalFields.minimalResponse;
							}
							if (additionalFields.significantChangesOnly === true) {
								qs.significant_changes_only = additionalFields.significantChangesOnly;
							}
						}

						responseData = (await homeAssistantApiRequest.call(
							this,
							'GET',
							endpoint,
							{},
							qs,
						)) as IDataObject[];
						if (!returnAll) {
							const limit = this.getNodeParameter('limit', i);
							responseData = responseData.slice(0, limit);
						}
					}
				} else if (resource === 'cameraProxy') {
					if (operation === 'getScreenshot') {
						const cameraEntityId = this.getNodeParameter('cameraEntityId', i) as string;
						const dataPropertyNameDownload = this.getNodeParameter('binaryPropertyName', i);
						const endpoint = `/camera_proxy/${cameraEntityId}`;

						let mimeType: string | undefined;

						responseData = await homeAssistantApiRequest.call(
							this,
							'GET',
							endpoint,
							{},
							{},
							undefined,
							{
								encoding: null,
								resolveWithFullResponse: true,
							},
						);

						const newItem: INodeExecutionData = {
							json: items[i].json,
							binary: {},
						};

						if (mimeType === undefined && responseData.headers['content-type']) {
							mimeType = responseData.headers['content-type'];
						}

						if (items[i].binary !== undefined && newItem.binary) {
							// Create a shallow copy of the binary data so that the old
							// data references which do not get changed still stay behind
							// but the incoming data does not get changed.
							Object.assign(newItem.binary, items[i].binary);
						}

						items[i] = newItem;

						const data = Buffer.from(responseData.body as string);

						items[i].binary![dataPropertyNameDownload] = await this.helpers.prepareBinaryData(
							data,
							'screenshot.jpg',
							mimeType,
						);
					}
				}
			} catch (error) {
				if (this.continueOnFail()) {
					if (resource === 'cameraProxy' && operation === 'get') {
						items[i].json = { error: error.message };
					} else {
						returnData.push({ error: error.message });
					}
					continue;
				}
				throw error;
			}

			Array.isArray(responseData)
				? returnData.push(...responseData)
				: returnData.push(responseData);
		}

		if (resource === 'cameraProxy' && operation === 'getScreenshot') {
			return this.prepareOutputData(items);
		} else {
			return [this.helpers.returnJsonArray(returnData)];
		}
	}
}
