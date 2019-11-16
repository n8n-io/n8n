import {
	IExecuteSingleFunctions,
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
	leadOpeations,
	leadFields,
} from './LeadDescription';
import {
	intercomApiRequest,
	validateJSON,
} from './GenericFunctions';
import {
	ILead,
	ILeadCompany
 } from './LeadInterface';

export class Intercom implements INodeType {

	description: INodeTypeDescription = {
		displayName: 'Intercom',
		name: 'intercom',
		icon: 'file:intercom.png',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume intercom API',
		defaults: {
			name: 'Intercom',
			color: '#c02428',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'intercomApi',
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
						name: 'Lead',
						value: 'lead',
						description: '',
					},
				],
				default: '',
				description: 'Resource to consume.',
			},
			...leadOpeations,
			...leadFields,
		],
	};

	methods = {
		loadOptions: {
			// Get all the available companies to display them to user so that he can
			// select them easily
			async getCompanies(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				let companies, response;
				try {
					response = await intercomApiRequest.call(this, '/companies', 'GET');
				} catch (err) {
					throw new Error(`Intercom Error: ${err}`);
				}
				companies = response.companies;
				for (const company of companies) {
					const companyName = company.name;
					const companyId = company.company_id;
					returnData.push({
						name: companyName,
						value: companyId,
					});
				}
				return returnData;
			}
		},
	};

	async executeSingle(this: IExecuteSingleFunctions): Promise<INodeExecutionData> {
		const resource = this.getNodeParameter('resource') as string;
		const opeation = this.getNodeParameter('operation') as string;
		let response;
		if (resource === 'lead') {
			if (opeation === 'create') {
				const email = this.getNodeParameter('email') as string;
				const options = this.getNodeParameter('options') as IDataObject;
				const jsonActive = this.getNodeParameter('jsonParameters') as boolean;
				const body: ILead = {
					email,
				};
				if (options.phone) {
					body.phone = options.phone as string;
				}
				if (options.name) {
					body.name = options.name as string;
				}
				if (options.name) {
					body.name = options.name as string;
				}
				if (options.unsubscribedFromEmails) {
					body.unsubscribed_from_emails = options.unsubscribedFromEmails as boolean;
				}
				if (options.updateLastRequestAt) {
					body.update_last_request_at = options.updateLastRequestAt as boolean;
				}
				if (options.companies) {
					const companies: ILeadCompany[] = [];
					// @ts-ignore
					options.companies.forEach( o => {
						const company: ILeadCompany = {};
						company.company_id = o;
						companies.push(company);
					});
					body.companies = companies;
				}
				if (!jsonActive) {
					const customAttributesValues = (this.getNodeParameter('customAttributesUi') as IDataObject).customAttributesValues as IDataObject[];
					if (customAttributesValues) {
						const customAttributes = {};
						for (let i = 0; i < customAttributesValues.length; i++) {
							// @ts-ignore
							customAttributes[customAttributesValues[i].name] = customAttributesValues[i].value;
						}
						body.custom_attributes = customAttributes;
					}
				} else {
					const customAttributesJson = validateJSON(this.getNodeParameter('customAttributesJson') as string);
					if (customAttributesJson) {
						body.custom_attributes = customAttributesJson;
					}
				}
				try {
					response = await intercomApiRequest.call(this, '/contacts', 'POST', body);
				} catch (err) {
					throw new Error(`Intercom Error: ${JSON.stringify(err)}`);
				}
			}
		}
		return {
			json: response,
		};
	}
}
