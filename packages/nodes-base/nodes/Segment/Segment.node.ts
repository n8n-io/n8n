import type {
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import { segmentApiRequest } from './GenericFunctions';
import { groupFields, groupOperations } from './GroupDescription';
import { identifyFields, identifyOperations } from './IdentifyDescription';
import type { IIdentify } from './IdentifyInterface';
import { trackFields, trackOperations } from './TrackDescription';
import type { IGroup, ITrack } from './TrackInterface';

export class Segment implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Segment',
		name: 'segment',
		icon: 'file:segment.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ":" + $parameter["resource"]}}',
		description: 'Consume Segment API',
		defaults: {
			name: 'Segment',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'segmentApi',
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
						name: 'Group',
						value: 'group',
						description: 'Group lets you associate an identified user with a group',
					},
					{
						name: 'Identify',
						value: 'identify',
						description: 'Identify lets you tie a user to their actions',
					},
					{
						name: 'Track',
						value: 'track',
						description: 'Track lets you record events',
					},
				],
				default: 'identify',
			},
			...groupOperations,
			...groupFields,
			...identifyOperations,
			...trackOperations,
			...identifyFields,
			...trackFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = items.length;
		let responseData;
		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);

		for (let i = 0; i < length; i++) {
			try {
				if (resource === 'group') {
					//https://segment.com/docs/connections/sources/catalog/libraries/server/http-api/#group
					if (operation === 'add') {
						const userId = this.getNodeParameter('userId', i) as string;
						const groupId = this.getNodeParameter('groupId', i) as string;
						const traits = (this.getNodeParameter('traits', i) as IDataObject)
							.traitsUi as IDataObject[];
						const context = (this.getNodeParameter('context', i) as IDataObject)
							.contextUi as IDataObject;
						const integrations = (this.getNodeParameter('integrations', i) as IDataObject)
							.integrationsUi as IDataObject;
						const body: IGroup = {
							groupId,
							traits: {
								company: {},
								address: {},
							},
							context: {
								app: {},
								campaign: {},
								device: {},
							},
							integrations: {},
						};
						if (userId) {
							body.userId = userId;
						} else {
							body.anonymousId = uuid();
						}
						if (traits) {
							if (traits && traits.length !== 0) {
								for (const trait of traits) {
									body.traits![trait.key as string] = trait.value;
								}
							}
						}
						if (context) {
							if (context.active) {
								body.context!.active = context.active as boolean;
							}
							if (context.ip) {
								body.context!.ip = context.ip as string;
							}
							if (context.locate) {
								body.context!.locate = context.locate as string;
							}
							if (context.page) {
								body.context!.page = context.page as string;
							}
							if (context.timezone) {
								body.context!.timezone = context.timezone as string;
							}
							if (context.timezone) {
								body.context!.timezone = context.timezone as string;
							}
							if (context.app) {
								const app = (context.app as IDataObject).appUi as IDataObject;
								if (app) {
									if (app.name) {
										//@ts-ignore
										body.context.app.name = app.name as string;
									}
									if (app.version) {
										//@ts-ignore
										body.context.app.version = app.version as string;
									}
									if (app.build) {
										//@ts-ignore
										body.context.app.build = app.build as string;
									}
								}
							}
							if (context.campaign) {
								const campaign = (context.campaign as IDataObject).campaignUi as IDataObject;
								if (campaign) {
									if (campaign.name) {
										//@ts-ignore
										body.context.campaign.name = campaign.name as string;
									}
									if (campaign.source) {
										//@ts-ignore
										body.context.campaign.source = campaign.source as string;
									}
									if (campaign.medium) {
										//@ts-ignore
										body.context.campaign.medium = campaign.medium as string;
									}
									if (campaign.term) {
										//@ts-ignore
										body.context.campaign.term = campaign.term as string;
									}
									if (campaign.content) {
										//@ts-ignore
										body.context.campaign.content = campaign.content as string;
									}
								}
							}

							if (context.device) {
								const device = (context.device as IDataObject).deviceUi as IDataObject;
								if (device) {
									if (device.id) {
										//@ts-ignore
										body.context.device.id = device.id as string;
									}
									if (device.manufacturer) {
										//@ts-ignore
										body.context.device.manufacturer = device.manufacturer as string;
									}
									if (device.model) {
										//@ts-ignore
										body.context.device.model = device.model as string;
									}
									if (device.type) {
										//@ts-ignore
										body.context.device.type = device.type as string;
									}
									if (device.version) {
										//@ts-ignore
										body.context.device.version = device.version as string;
									}
								}
							}
						}
						if (integrations) {
							if (integrations.all) {
								body.integrations!.all = integrations.all as boolean;
							}
							if (integrations.salesforce) {
								body.integrations!.salesforce = integrations.salesforce as boolean;
							}
						}
						responseData = await segmentApiRequest.call(this, 'POST', '/group', body);
					}
				}
				if (resource === 'identify') {
					//https://segment.com/docs/connections/sources/catalog/libraries/server/http-api/#identify
					if (operation === 'create') {
						const userId = this.getNodeParameter('userId', i) as string;
						const context = (this.getNodeParameter('context', i) as IDataObject)
							.contextUi as IDataObject;
						const traits = (this.getNodeParameter('traits', i) as IDataObject)
							.traitsUi as IDataObject[];
						const integrations = (this.getNodeParameter('integrations', i) as IDataObject)
							.integrationsUi as IDataObject;
						const body: IIdentify = {
							context: {
								app: {},
								campaign: {},
								device: {},
							},
							traits: {},
							integrations: {},
						};
						if (userId) {
							body.userId = userId;
						} else {
							body.anonymousId = uuid();
						}
						if (context) {
							if (context.active) {
								body.context!.active = context.active as boolean;
							}
							if (context.ip) {
								body.context!.ip = context.ip as string;
							}
							if (context.locate) {
								body.context!.locate = context.locate as string;
							}
							if (context.page) {
								body.context!.page = context.page as string;
							}
							if (context.timezone) {
								body.context!.timezone = context.timezone as string;
							}
							if (context.timezone) {
								body.context!.timezone = context.timezone as string;
							}
							if (context.app) {
								const app = (context.app as IDataObject).appUi as IDataObject;
								if (app) {
									if (app.name) {
										//@ts-ignore
										body.context.app.name = app.name as string;
									}
									if (app.version) {
										//@ts-ignore
										body.context.app.version = app.version as string;
									}
									if (app.build) {
										//@ts-ignore
										body.context.app.build = app.build as string;
									}
								}
							}
							if (context.campaign) {
								const campaign = (context.campaign as IDataObject).campaignUi as IDataObject;
								if (campaign) {
									if (campaign.name) {
										//@ts-ignore
										body.context.campaign.name = campaign.name as string;
									}
									if (campaign.source) {
										//@ts-ignore
										body.context.campaign.source = campaign.source as string;
									}
									if (campaign.medium) {
										//@ts-ignore
										body.context.campaign.medium = campaign.medium as string;
									}
									if (campaign.term) {
										//@ts-ignore
										body.context.campaign.term = campaign.term as string;
									}
									if (campaign.content) {
										//@ts-ignore
										body.context.campaign.content = campaign.content as string;
									}
								}
							}

							if (context.device) {
								const device = (context.device as IDataObject).deviceUi as IDataObject;
								if (device) {
									if (device.id) {
										//@ts-ignore
										body.context.device.id = device.id as string;
									}
									if (device.manufacturer) {
										//@ts-ignore
										body.context.device.manufacturer = device.manufacturer as string;
									}
									if (device.model) {
										//@ts-ignore
										body.context.device.model = device.model as string;
									}
									if (device.type) {
										//@ts-ignore
										body.context.device.type = device.type as string;
									}
									if (device.version) {
										//@ts-ignore
										body.context.device.version = device.version as string;
									}
								}
							}
						}
						if (integrations) {
							if (integrations.all) {
								body.integrations!.all = integrations.all as boolean;
							}
							if (integrations.salesforce) {
								body.integrations!.salesforce = integrations.salesforce as boolean;
							}
						}

						if (traits) {
							if (traits && traits.length !== 0) {
								for (const trait of traits) {
									body.traits![trait.key as string] = trait.value;
								}
							}
						}

						responseData = await segmentApiRequest.call(this, 'POST', '/identify', body);
					}
				}
				if (resource === 'track') {
					//https://segment.com/docs/connections/sources/catalog/libraries/server/http-api/#track
					if (operation === 'event') {
						const userId = this.getNodeParameter('userId', i) as string;
						const event = this.getNodeParameter('event', i) as string;
						const context = (this.getNodeParameter('context', i) as IDataObject)
							.contextUi as IDataObject;
						const integrations = (this.getNodeParameter('integrations', i) as IDataObject)
							.integrationsUi as IDataObject;
						const properties = (this.getNodeParameter('properties', i) as IDataObject)
							.propertiesUi as IDataObject[];
						const body: ITrack = {
							event,
							traits: {},
							context: {
								app: {},
								campaign: {},
								device: {},
							},
							integrations: {},
							properties: {},
						};
						if (userId) {
							body.userId = userId;
						} else {
							body.anonymousId = uuid();
						}
						if (context) {
							if (context.active) {
								body.context!.active = context.active as boolean;
							}
							if (context.ip) {
								body.context!.ip = context.ip as string;
							}
							if (context.locate) {
								body.context!.locate = context.locate as string;
							}
							if (context.page) {
								body.context!.page = context.page as string;
							}
							if (context.timezone) {
								body.context!.timezone = context.timezone as string;
							}
							if (context.timezone) {
								body.context!.timezone = context.timezone as string;
							}
							if (context.app) {
								const app = (context.app as IDataObject).appUi as IDataObject;
								if (app) {
									if (app.name) {
										//@ts-ignore
										body.context.app.name = app.name as string;
									}
									if (app.version) {
										//@ts-ignore
										body.context.app.version = app.version as string;
									}
									if (app.build) {
										//@ts-ignore
										body.context.app.build = app.build as string;
									}
								}
							}
							if (context.campaign) {
								const campaign = (context.campaign as IDataObject).campaignUi as IDataObject;
								if (campaign) {
									if (campaign.name) {
										//@ts-ignore
										body.context.campaign.name = campaign.name as string;
									}
									if (campaign.source) {
										//@ts-ignore
										body.context.campaign.source = campaign.source as string;
									}
									if (campaign.medium) {
										//@ts-ignore
										body.context.campaign.medium = campaign.medium as string;
									}
									if (campaign.term) {
										//@ts-ignore
										body.context.campaign.term = campaign.term as string;
									}
									if (campaign.content) {
										//@ts-ignore
										body.context.campaign.content = campaign.content as string;
									}
								}
							}

							if (context.device) {
								const device = (context.device as IDataObject).deviceUi as IDataObject;
								if (device) {
									if (device.id) {
										//@ts-ignore
										body.context.device.id = device.id as string;
									}
									if (device.manufacturer) {
										//@ts-ignore
										body.context.device.manufacturer = device.manufacturer as string;
									}
									if (device.model) {
										//@ts-ignore
										body.context.device.model = device.model as string;
									}
									if (device.type) {
										//@ts-ignore
										body.context.device.type = device.type as string;
									}
									if (device.version) {
										//@ts-ignore
										body.context.device.version = device.version as string;
									}
								}
							}
						}
						if (integrations) {
							if (integrations.all) {
								body.integrations!.all = integrations.all as boolean;
							}
							if (integrations.salesforce) {
								body.integrations!.salesforce = integrations.salesforce as boolean;
							}
						}
						if (properties) {
							if (properties && properties.length !== 0) {
								for (const property of properties) {
									body.properties![property.key as string] = property.value;
								}
							}
						}

						responseData = await segmentApiRequest.call(this, 'POST', '/track', body);
					}
					//https://segment.com/docs/connections/sources/catalog/libraries/server/http-api/#page
					if (operation === 'page') {
						const userId = this.getNodeParameter('userId', i) as string;
						const name = this.getNodeParameter('name', i) as string;
						const context = (this.getNodeParameter('context', i) as IDataObject)
							.contextUi as IDataObject;
						const integrations = (this.getNodeParameter('integrations', i) as IDataObject)
							.integrationsUi as IDataObject;
						const properties = (this.getNodeParameter('properties', i) as IDataObject)
							.propertiesUi as IDataObject[];
						const body: ITrack = {
							name,
							traits: {},
							context: {
								app: {},
								campaign: {},
								device: {},
							},
							integrations: {},
							properties: {},
						};
						if (userId) {
							body.userId = userId;
						} else {
							body.anonymousId = uuid();
						}
						if (context) {
							if (context.active) {
								body.context!.active = context.active as boolean;
							}
							if (context.ip) {
								body.context!.ip = context.ip as string;
							}
							if (context.locate) {
								body.context!.locate = context.locate as string;
							}
							if (context.page) {
								body.context!.page = context.page as string;
							}
							if (context.timezone) {
								body.context!.timezone = context.timezone as string;
							}
							if (context.timezone) {
								body.context!.timezone = context.timezone as string;
							}
							if (context.app) {
								const app = (context.app as IDataObject).appUi as IDataObject;
								if (app) {
									if (app.name) {
										//@ts-ignore
										body.context.app.name = app.name as string;
									}
									if (app.version) {
										//@ts-ignore
										body.context.app.version = app.version as string;
									}
									if (app.build) {
										//@ts-ignore
										body.context.app.build = app.build as string;
									}
								}
							}
							if (context.campaign) {
								const campaign = (context.campaign as IDataObject).campaignUi as IDataObject;
								if (campaign) {
									if (campaign.name) {
										//@ts-ignore
										body.context.campaign.name = campaign.name as string;
									}
									if (campaign.source) {
										//@ts-ignore
										body.context.campaign.source = campaign.source as string;
									}
									if (campaign.medium) {
										//@ts-ignore
										body.context.campaign.medium = campaign.medium as string;
									}
									if (campaign.term) {
										//@ts-ignore
										body.context.campaign.term = campaign.term as string;
									}
									if (campaign.content) {
										//@ts-ignore
										body.context.campaign.content = campaign.content as string;
									}
								}
							}

							if (context.device) {
								const device = (context.device as IDataObject).deviceUi as IDataObject;
								if (device) {
									if (device.id) {
										//@ts-ignore
										body.context.device.id = device.id as string;
									}
									if (device.manufacturer) {
										//@ts-ignore
										body.context.device.manufacturer = device.manufacturer as string;
									}
									if (device.model) {
										//@ts-ignore
										body.context.device.model = device.model as string;
									}
									if (device.type) {
										//@ts-ignore
										body.context.device.type = device.type as string;
									}
									if (device.version) {
										//@ts-ignore
										body.context.device.version = device.version as string;
									}
								}
							}
						}
						if (integrations) {
							if (integrations.all) {
								body.integrations!.all = integrations.all as boolean;
							}
							if (integrations.salesforce) {
								body.integrations!.salesforce = integrations.salesforce as boolean;
							}
						}
						if (properties) {
							if (properties && properties.length !== 0) {
								for (const property of properties) {
									body.properties![property.key as string] = property.value;
								}
							}
						}
						responseData = await segmentApiRequest.call(this, 'POST', '/page', body);
					}
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: error.message });
					continue;
				}
				throw error;
			}
			if (Array.isArray(responseData)) {
				returnData.push.apply(returnData, responseData as IDataObject[]);
			} else {
				returnData.push(responseData as IDataObject);
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
