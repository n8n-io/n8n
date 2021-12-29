import {IExecuteFunctions,} from 'n8n-core';

import {IDataObject, INodeExecutionData, INodeType, INodeTypeDescription,} from 'n8n-workflow';
import {clientFields, clientOperations} from './ClientDescription';
import {getResponseByUri, UrlParams} from './helpers';
import {cityFields, cityOperations} from './CityDescription';
import {industryFields, industryOperations} from './IndustryDescription';
import {contractFields, contractOperations} from "./ContractDescription";

const helpers = require('./helpers');


export class Gllue implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Gllue',
		name: 'gllue',
		icon: 'file:gllue.svg',
		group: ['transform'],
		version: 1,
		description: 'Consume Gllue API',
		defaults: {
			name: 'Gllue',
			color: '#1A82e2',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'gllueApi',
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
						name: 'Client',
						value: 'client',
					},
					{
						name: 'City',
						value: 'city',
					},
					{
						name: 'Industry',
						value: 'industry',
					},
					{
						name: 'Contract',
						value: 'clientcontract',
					},
				],
				default: 'client',
				required: true,
				description: 'Resource to Gllue',
			},
			...clientOperations,
			...clientFields,
			...cityOperations,
			...cityFields,
			...industryOperations,
			...industryFields,
			...contractOperations,
			...contractFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		let responseData;
		const items = this.getInputData();
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		// tslint:disable-next-line:no-any
		const filters = this.getNodeParameter('filters', 0) as any;
		const credentials = await this.getCredentials('gllueApi') as IDataObject;

		const timestamp = helpers.getCurrentTimeStamp();
		const token = helpers.generateTokenWithAESKey(timestamp, credentials.apiUsername, credentials.apiAesKey);
		const urlParams = new UrlParams(filters.query, filters.fields, token);
		const uriGenerated = helpers.gllueUrlBuilder(credentials.apiHost, resource, operation, urlParams);

		if (resource === 'client') {
			if (operation === 'simple_list_with_ids') {
				responseData = await getResponseByUri(uriGenerated, this.helpers.request);
			}
		} else if (resource === 'city') {
			if (operation === 'simple_list_with_ids') {
				responseData = await getResponseByUri(uriGenerated, this.helpers.request);
			}
		} else if (resource == 'industry') {
			if (operation === 'simple_list_with_ids'){
				responseData = await getResponseByUri(uriGenerated, this.helpers.request);
			}
		} else if (resource == 'contract'){
			if (operation === 'delete'){
				const api_path = '/rest/clientcontract/delete';
				const contract_ids = items.map(
					(item, index) => this.getNodeParameter('id', index)
				);
				const body = { ids: contract_ids, count: contract_ids.length };
				responseData = await helpers.gllueApiRequest.call(this, 'POST', api_path,{}, body, credentials);
			}
		}
		return [this.helpers.returnJsonArray(responseData)];
	}
}

