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
} from './GenericFunctions';

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
					const companyId = company.id;
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

		return {
			json: {},
		};
	}
}
