import {
	IExecuteFunctions,
} from 'n8n-core';
import {
	IDataObject,
	INodeTypeDescription,
	INodeExecutionData,
	INodeType,
	ILoadOptionsFunctions,
	INodePropertyOptions,
} from 'n8n-workflow';
import {
	hubspotApiRequest,
	hubspotApiRequestAllItems,
	validateJSON,
 } from './GenericFunctions';
import {
	dealOperations,
	dealFields,
} from '../Hubspot/DealDescription';
import { IDeal, IAssociation } from './DealInterface';

export class Hubspot implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Hubspot',
		name: 'hubspot',
		icon: 'file:hubspot.png',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Hubspot API',
		defaults: {
			name: 'Hubspot',
			color: '#356ae6',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'hubspotApi',
				required: true,
			}
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Deal',
						value: 'deal',
					},
				],
				default: 'deal',
				description: 'Resource to consume.',
			},

			// Deal
			...dealOperations,
			...dealFields,
		],
	};

	methods = {
		loadOptions: {
			// Get all the groups to display them to user so that he can
			// select them easily
			async getDealStages(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				let stages;
				try {
					const endpoint = '/crm-pipelines/v1/pipelines/deals';
					stages = await hubspotApiRequest.call(this, 'GET', endpoint, {});
					stages = stages.results[0].stages;
				} catch (err) {
					throw new Error(`Hubspot Error: ${err}`);
				}
				for (const stage of stages) {
					const stageName = stage.label;
					const stageId = stage.stageId;
					returnData.push({
						name: stageName,
						value: stageId,
					});
				}
				return returnData;
			},

			// Get all the companies to display them to user so that he can
			// select them easily
			async getCompanies(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				let companies;
				try {
					const endpoint = '/companies/v2/companies/paged';
					companies = await hubspotApiRequestAllItems.call(this, 'results', 'GET', endpoint);
				} catch (err) {
					throw new Error(`Hubspot Error: ${err}`);
				}
				for (const company of companies) {
					const companyName = company.properties.name.value;
					const companyId = company.companyId;
					returnData.push({
						name: companyName,
						value: companyId,
					});
				}
				return returnData;
			},

			// Get all the companies to display them to user so that he can
			// select them easily
			async getContacts(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				let contacts;
				try {
					const endpoint = '/contacts/v1/lists/all/contacts/all';
					contacts = await hubspotApiRequestAllItems.call(this, 'contacts', 'GET', endpoint);
				} catch (err) {
					throw new Error(`Hubspot Error: ${err}`);
				}
				for (const contact of contacts) {
					const contactName = `${contact.properties.firstname.value} ${contact.properties.lastname.value}` ;
					const contactId = contact.vid;
					returnData.push({
						name: contactName,
						value: contactId,
					});
				}
				return returnData;
			},

			// Get all the deal types to display them to user so that he can
			// select them easily
			async getDealTypes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				let dealTypes;
				try {
					const endpoint = '/properties/v1/deals/properties/named/dealtype';
					dealTypes = await hubspotApiRequest.call(this, 'GET', endpoint);
				} catch (err) {
					throw new Error(`Hubspot Error: ${err}`);
				}
				for (const dealType of dealTypes.options) {
					const dealTypeName = dealType.label ;
					const dealTypeId = dealType.value;
					returnData.push({
						name: dealTypeName,
						value: dealTypeId,
					});
				}
				return returnData;
			},
		}
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = items.length as unknown as number;
		let responseData;
		const qs: IDataObject = {};
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		for (let i = 0; i < length; i++) {
			if (resource === 'deal') {
				if (operation === 'create') {
					const body: IDeal = {};
					const association: IAssociation = {};
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					const stage = this.getNodeParameter('stage', i) as string;
					if (stage) {
						// @ts-ignore
						body.properties.push({
							name: 'dealstage',
							value: stage
						});
					}
					if (additionalFields.associatedCompany) {
						association.associatedCompanyIds = additionalFields.associatedCompany as number[];
					}
					if (additionalFields.associatedVids) {
						association.associatedVids = additionalFields.associatedVids as number[];
					}
					if (additionalFields.dealName) {
						// @ts-ignore
						body.properties.push({
							name: 'dealname',
							value: additionalFields.dealName as string
						});
					}
					if (additionalFields.closeDate) {
						// @ts-ignore
						body.properties.push({
							name: 'closedate',
							value: new Date(additionalFields.closeDate as string).getTime()
						});
					}
					if (additionalFields.amount) {
						// @ts-ignore
						body.properties.push({
							name: 'amount',
							value: additionalFields.amount as string
						});
					}
					if (additionalFields.dealType) {
						// @ts-ignore
						body.properties.push({
							name: 'dealtype',
							value: additionalFields.dealType as string
						});
					}
					if (additionalFields.pipeline) {
						// @ts-ignore
						body.properties.push({
							name: 'pipeline',
							value: additionalFields.pipeline as string
						});
					}
					body.association = association;
					try {
						const endpoint = '/deals/v1/deal';
						responseData = await hubspotApiRequest.call(this, 'POST', endpoint, body);
					} catch (err) {
						throw new Error(`Hubspot Error: ${JSON.stringify(err)}`);
					}
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
