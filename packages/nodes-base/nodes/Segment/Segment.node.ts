import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	segmentApiRequest,
} from './GenericFunctions';

import {
	groupFields,
	groupOperations,
} from './GroupDescription';

import {
	identifyFields,
	identifyOperations,
} from './IdentifyDescription';

import {
	IIdentify,
} from './IdentifyInterface';

import {
	trackFields,
	trackOperations,
} from './TrackDescription';

import {
	IGroup,
	ITrack,
} from './TrackInterface';

import * as uuid from 'uuid/v4';
import { customerFields } from '../CustomerIo/CustomerDescription';

export class Segment implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Segment',
		name: 'segment',
		icon: 'file:segment.png',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ":" + $parameter["resource"]}}',
		description: 'Consume Segment API',
		defaults: {
			name: 'Segment',
			color: '#6ebb99',
		},
		inputs: ['main'],
		outputs: ['main'],
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
				description: 'Resource to consume.',
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
		const length = items.length as unknown as number;
		const qs: IDataObject = {};
		let responseData;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < length; i++) {
			if (resource === 'group') {
				//https://segment.com/docs/connections/sources/catalog/libraries/server/http-api/#group
				if (operation === 'add') {
					const userId = this.getNodeParameter('userId', i) as string;
					const groupId = this.getNodeParameter('groupId', i) as string;
					const traits = (this.getNodeParameter('traits', i) as IDataObject).traitsUi as IDataObject;
					const context = (this.getNodeParameter('context', i) as IDataObject).contextUi as IDataObject;
					const integrations = (this.getNodeParameter('integrations', i) as IDataObject).integrationsUi as IDataObject;
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
						body.userId = userId as string;
					} else {
						body.anonymousId = uuid();
					}
					if (traits) {
						if (traits.email) {
							body.traits!.email = traits.email as string;
						}
						if (traits.firstname) {
							body.traits!.firstname = traits.firstname as string;
						}
						if (traits.lastname) {
							body.traits!.lastname = traits.lastname as string;
						}
						if (traits.gender) {
							body.traits!.gender = traits.gender as string;
						}
						if (traits.phone) {
							body.traits!.phone = traits.phone as string;
						}
						if (traits.username) {
							body.traits!.username = traits.username as string;
						}
						if (traits.website) {
							body.traits!.website = traits.website as string;
						}
						if (traits.age) {
							body.traits!.age = traits.age as number;
						}
						if (traits.avatar) {
							body.traits!.avatar = traits.avatar as string;
						}
						if (traits.birthday) {
							body.traits!.birthday = traits.birthday as string;
						}
						if (traits.createdAt) {
							body.traits!.createdAt = traits.createdAt as string;
						}
						if (traits.description) {
							body.traits!.description = traits.description as string;
						}
						if (traits.id) {
							body.traits!.id = traits.id as string;
						}
						
						if (traits.company) {
							const company = (traits.company as IDataObject).companyUi as IDataObject;
							if (company) {
								if (company.id) {
									//@ts-ignore
									body.traits.company.id = company.id as string;
								}
								if (company.name) {
									//@ts-ignore
									body.traits.company.name = company.name as string;
								}
								if (company.industry) {
									//@ts-ignore
									body.traits.company.industry = company.industry as string;
								}
								if (company.employeeCount) {
									//@ts-ignore
									body.traits.company.employeeCount = company.employeeCount as number;
								}
								if (company.plan) {
									//@ts-ignore
									body.traits.company.plan = company.plan as string;
								}
							}
						}
						if (traits.address) {
							const address = (traits.address as IDataObject).addressUi as IDataObject;
							if (address) {
								if (address.street) {
									//@ts-ignore
									body.traits.address.street = address.street as string;
								}
								if (address.city) {
									//@ts-ignore
									body.traits.address.city = address.city as string;
								}
								if (address.state) {
									//@ts-ignore
									body.traits.address.state = address.state as string;
								}
								if (address.postalCode) {
									//@ts-ignore
									body.traits.address.postalCode = address.postalCode as string;
								}
								if (address.country) {
									//@ts-ignore
									body.traits.address.country = address.country as string;
								}
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
					const traits = (this.getNodeParameter('traits', i) as IDataObject).traitsUi as IDataObject;
					const context = (this.getNodeParameter('context', i) as IDataObject).contextUi as IDataObject;
					const integrations = (this.getNodeParameter('integrations', i) as IDataObject).integrationsUi as IDataObject;
					const body: IIdentify = {
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
						body.userId = userId as string;
					} else {
						body.anonymousId = uuid();
					}
					if (traits) {
						if (traits.email) {
							body.traits!.email = traits.email as string;
						}
						if (traits.firstname) {
							body.traits!.firstname = traits.firstname as string;
						}
						if (traits.lastname) {
							body.traits!.lastname = traits.lastname as string;
						}
						if (traits.gender) {
							body.traits!.gender = traits.gender as string;
						}
						if (traits.phone) {
							body.traits!.phone = traits.phone as string;
						}
						if (traits.username) {
							body.traits!.username = traits.username as string;
						}
						if (traits.website) {
							body.traits!.website = traits.website as string;
						}
						if (traits.age) {
							body.traits!.age = traits.age as number;
						}
						if (traits.avatar) {
							body.traits!.avatar = traits.avatar as string;
						}
						if (traits.birthday) {
							body.traits!.birthday = traits.birthday as string;
						}
						if (traits.createdAt) {
							body.traits!.createdAt = traits.createdAt as string;
						}
						if (traits.description) {
							body.traits!.description = traits.description as string;
						}
						if (traits.id) {
							body.traits!.id = traits.id as string;
						}
						if (traits.customTraitsUi) {
							const customTraits = (traits.customTraitsUi as IDataObject).customTraitValues as IDataObject[];
							if (customTraits && customTraits.length !== 0) {
								for (const customTrait of customTraits) {
									body.traits![customTrait.key as string] = customTrait.value;
								}
							}
						}
						if (traits.company) {
							const company = (traits.company as IDataObject).companyUi as IDataObject;
							if (company) {
								if (company.id) {
									//@ts-ignore
									body.traits.company.id = company.id as string;
								}
								if (company.name) {
									//@ts-ignore
									body.traits.company.name = company.name as string;
								}
								if (company.industry) {
									//@ts-ignore
									body.traits.company.industry = company.industry as string;
								}
								if (company.employeeCount) {
									//@ts-ignore
									body.traits.company.employeeCount = company.employeeCount as number;
								}
								if (company.plan) {
									//@ts-ignore
									body.traits.company.plan = company.plan as string;
								}
							}
						}
						if (traits.address) {
							const address = (traits.address as IDataObject).addressUi as IDataObject;
							if (address) {
								if (address.street) {
									//@ts-ignore
									body.traits.address.street = address.street as string;
								}
								if (address.city) {
									//@ts-ignore
									body.traits.address.city = address.city as string;
								}
								if (address.state) {
									//@ts-ignore
									body.traits.address.state = address.state as string;
								}
								if (address.postalCode) {
									//@ts-ignore
									body.traits.address.postalCode = address.postalCode as string;
								}
								if (address.country) {
									//@ts-ignore
									body.traits.address.country = address.country as string;
								}
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

					if (Object.keys(traits.company as IDataObject).length === 0) {
						//@ts-ignore
						delete body.traits.company;
					}

					if (Object.keys(traits.address as IDataObject).length === 0) {
						//@ts-ignore
						delete body.traits.address;
					}

					responseData = await segmentApiRequest.call(this, 'POST', '/identify', body);
				}
			}
			if (resource === 'track') {
				//https://segment.com/docs/connections/sources/catalog/libraries/server/http-api/#track
				if (operation === 'event') {
					const userId = this.getNodeParameter('userId', i) as string;
					const event = this.getNodeParameter('event', i) as string;
					const traits = (this.getNodeParameter('traits', i) as IDataObject).traitsUi as IDataObject;
					const context = (this.getNodeParameter('context', i) as IDataObject).contextUi as IDataObject;
					const integrations = (this.getNodeParameter('integrations', i) as IDataObject).integrationsUi as IDataObject;
					const properties = (this.getNodeParameter('properties', i) as IDataObject).propertiesUi as IDataObject;
					const body: ITrack = {
						event,
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
						properties: {},
					};
					if (userId) {
						body.userId = userId as string;
					} else {
						body.anonymousId = uuid();
					}
					if (traits) {
						if (traits.email) {
							body.traits!.email = traits.email as string;
						}
						if (traits.firstname) {
							body.traits!.firstname = traits.firstname as string;
						}
						if (traits.lastname) {
							body.traits!.lastname = traits.lastname as string;
						}
						if (traits.gender) {
							body.traits!.gender = traits.gender as string;
						}
						if (traits.phone) {
							body.traits!.phone = traits.phone as string;
						}
						if (traits.username) {
							body.traits!.username = traits.username as string;
						}
						if (traits.website) {
							body.traits!.website = traits.website as string;
						}
						if (traits.age) {
							body.traits!.age = traits.age as number;
						}
						if (traits.avatar) {
							body.traits!.avatar = traits.avatar as string;
						}
						if (traits.birthday) {
							body.traits!.birthday = traits.birthday as string;
						}
						if (traits.createdAt) {
							body.traits!.createdAt = traits.createdAt as string;
						}
						if (traits.description) {
							body.traits!.description = traits.description as string;
						}
						if (traits.id) {
							body.traits!.id = traits.id as string;
						}
						if (traits.customTraitsUi) {
							const customTraits = (traits.customTraitsUi as IDataObject).customTraitValues as IDataObject[];
							if (customTraits && customTraits.length !== 0) {
								for (const customTrait of customTraits) {
									body.traits![customTrait.key as string] = customTrait.value;
								}
							}
						}
						if (traits.company) {
							const company = (traits.company as IDataObject).companyUi as IDataObject;
							if (company) {
								if (company.id) {
									//@ts-ignore
									body.traits.company.id = company.id as string;
								}
								if (company.name) {
									//@ts-ignore
									body.traits.company.name = company.name as string;
								}
								if (company.industry) {
									//@ts-ignore
									body.traits.company.industry = company.industry as string;
								}
								if (company.employeeCount) {
									//@ts-ignore
									body.traits.company.employeeCount = company.employeeCount as number;
								}
								if (company.plan) {
									//@ts-ignore
									body.traits.company.plan = company.plan as string;
								}
							}
						}
						if (traits.address) {
							const address = (traits.address as IDataObject).addressUi as IDataObject;
							if (address) {
								if (address.street) {
									//@ts-ignore
									body.traits.address.street = address.street as string;
								}
								if (address.city) {
									//@ts-ignore
									body.traits.address.city = address.city as string;
								}
								if (address.state) {
									//@ts-ignore
									body.traits.address.state = address.state as string;
								}
								if (address.postalCode) {
									//@ts-ignore
									body.traits.address.postalCode = address.postalCode as string;
								}
								if (address.country) {
									//@ts-ignore
									body.traits.address.country = address.country as string;
								}
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
					if (properties) {
						if (properties.revenue) {
							body.properties!.revenue = properties.revenue as number;
						}
						if (properties.currency) {
							body.properties!.currency = properties.currency as string;
						}
						if (properties.value) {
							body.properties!.value = properties.value as string;
						}
					}

					if (Object.keys(traits.company as IDataObject).length === 0) {
						//@ts-ignore
						delete body.traits.company;
					}

					if (Object.keys(traits.address as IDataObject).length === 0) {
						//@ts-ignore
						delete body.traits.address;
					}

					responseData = await segmentApiRequest.call(this, 'POST', '/track', body);
				}
				//https://segment.com/docs/connections/sources/catalog/libraries/server/http-api/#page
				if (operation === 'page') {
					const userId = this.getNodeParameter('userId', i) as string;
					const event = this.getNodeParameter('event', i) as string;
					const traits = (this.getNodeParameter('traits', i) as IDataObject).traitsUi as IDataObject;
					const context = (this.getNodeParameter('context', i) as IDataObject).contextUi as IDataObject;
					const integrations = (this.getNodeParameter('integrations', i) as IDataObject).integrationsUi as IDataObject;
					const properties = (this.getNodeParameter('properties', i) as IDataObject).propertiesUi as IDataObject;
					const body: ITrack = {
						event,
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
						properties: {},
					};
					if (userId) {
						body.userId = userId as string;
					} else {
						body.anonymousId = uuid();
					}
					if (traits) {
						if (traits.email) {
							body.traits!.email = traits.email as string;
						}
						if (traits.firstname) {
							body.traits!.firstname = traits.firstname as string;
						}
						if (traits.lastname) {
							body.traits!.lastname = traits.lastname as string;
						}
						if (traits.gender) {
							body.traits!.gender = traits.gender as string;
						}
						if (traits.phone) {
							body.traits!.phone = traits.phone as string;
						}
						if (traits.username) {
							body.traits!.username = traits.username as string;
						}
						if (traits.website) {
							body.traits!.website = traits.website as string;
						}
						if (traits.age) {
							body.traits!.age = traits.age as number;
						}
						if (traits.avatar) {
							body.traits!.avatar = traits.avatar as string;
						}
						if (traits.birthday) {
							body.traits!.birthday = traits.birthday as string;
						}
						if (traits.createdAt) {
							body.traits!.createdAt = traits.createdAt as string;
						}
						if (traits.description) {
							body.traits!.description = traits.description as string;
						}
						if (traits.id) {
							body.traits!.id = traits.id as string;
						}
						if (traits.company) {
							const company = (traits.company as IDataObject).companyUi as IDataObject;
							if (company) {
								if (company.id) {
									//@ts-ignore
									body.traits.company.id = company.id as string;
								}
								if (company.name) {
									//@ts-ignore
									body.traits.company.name = company.name as string;
								}
								if (company.industry) {
									//@ts-ignore
									body.traits.company.industry = company.industry as string;
								}
								if (company.employeeCount) {
									//@ts-ignore
									body.traits.company.employeeCount = company.employeeCount as number;
								}
								if (company.plan) {
									//@ts-ignore
									body.traits.company.plan = company.plan as string;
								}
							}
						}
						if (traits.address) {
							const address = (traits.address as IDataObject).addressUi as IDataObject;
							if (address) {
								if (address.street) {
									//@ts-ignore
									body.traits.address.street = address.street as string;
								}
								if (address.city) {
									//@ts-ignore
									body.traits.address.city = address.city as string;
								}
								if (address.state) {
									//@ts-ignore
									body.traits.address.state = address.state as string;
								}
								if (address.postalCode) {
									//@ts-ignore
									body.traits.address.postalCode = address.postalCode as string;
								}
								if (address.country) {
									//@ts-ignore
									body.traits.address.country = address.country as string;
								}
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
					if (properties) {
						if (properties.name) {
							body.properties!.name = properties.name as number;
						}
						if (properties.path) {
							body.properties!.path = properties.path as string;
						}
						if (properties.referrer) {
							body.properties!.referrer = properties.referrer as string;
						}
						if (properties.search) {
							body.properties!.search = properties.search as string;
						}
						if (properties.title) {
							body.properties!.title = properties.title as string;
						}
						if (properties.url) {
							body.properties!.url = properties.url as string;
						}
						if (properties.keywords) {
							body.properties!.keywords = properties.keywords as string;
						}
					}
					responseData = await segmentApiRequest.call(this, 'POST', '/page', body);
				}
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
