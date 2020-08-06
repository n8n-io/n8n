import * as moment from 'moment';

import { IExecuteFunctions } from 'n8n-core';
import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	unleashedApiRequest,
	unleashedApiPaginatedRequest,
	formatDateField,
	convertNETDates,
} from './GenericFunctions';

import { unleashedResources } from './Resources';
import { stockOnHandFilters, salesOrdersFilters } from './Filters';
import { stackOnHandOptions, paginationOptions } from './ResourceOptions';

export class Unleashed implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Unleashed',
		name: 'unleashed',
		group: ['transform'],
		icon: 'file:unleashed.png',
		version: 1,
		description: 'Get data from Unleashed - inventory management software',
		defaults: {
			name: 'Unleashed',
			color: '#772244',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'unleashed',
				required: true,
			},
		],
		properties: [
			...unleashedResources,
			...stackOnHandOptions,
			...paginationOptions,
			...stockOnHandFilters,
			...salesOrdersFilters,
		]
	};


	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {

		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		let path = ''

		const resource = this.getNodeParameter('resource', 0) as string;
		//stockOnHand
		for (let i = 0; i < items.length; i++) {
			if (resource === 'stockOnHand') {
				path = 'StockOnHand'
				const requestMethod = 'GET'
				let filterParams = this.getNodeParameter('stockOnHandFilters', i, {}) as IDataObject;

				//convert date to YYYY-MM-DD format, maybe use moment for that?
				filterParams = formatDateField(filterParams, 'asAtDate')
				filterParams = formatDateField(filterParams, 'modifiedSince')
	
				const getAllPages = this.getNodeParameter('getAllPages', i, true) as boolean;
				if (getAllPages ===  false) {
					const pageSize = this.getNodeParameter('pageSize', i, 200) as number;
					const pageNumber = this.getNodeParameter('pageNumber', i, 1) as number;
					path = `${path}/${pageNumber}`
					filterParams = {...filterParams, pageSize}
				}

				if (getAllPages)  {
					let responseData = await unleashedApiPaginatedRequest.call(this, requestMethod, {}, path,  filterParams);
					returnData.push.apply(returnData, responseData);
				} else {
					let responseData = await unleashedApiRequest.call(this, requestMethod, {}, path,  filterParams);
					returnData.push.apply(returnData, responseData.Items);
				}

			} else if (resource === 'salesOrders') {
				
				path = 'SalesOrders'
				const requestMethod = 'GET'
				let filterParams = this.getNodeParameter('salesOrdersFilters', i, {}) as IDataObject;

				//convert date to YYYY-MM-DD format, maybe use moment for that?				
				filterParams = formatDateField(filterParams, 'startDate')
				filterParams = formatDateField(filterParams, 'endDate')
				filterParams = formatDateField(filterParams, 'modifiedSince')
	
				const getAllPages = this.getNodeParameter('getAllPages', i, true) as boolean;
				if (getAllPages ===  false) {
					const pageSize = this.getNodeParameter('pageSize', i, 200) as number;
					const pageNumber = this.getNodeParameter('pageNumber', i, 1) as number;
					path = `${path}/${pageNumber}`
					filterParams = {...filterParams, pageSize}
				}

				if (getAllPages)  {
					let responseData = await unleashedApiPaginatedRequest.call(this, requestMethod, {}, path,  filterParams);
					returnData.push.apply(returnData, responseData);
				} else {
					let responseData = await unleashedApiRequest.call(this, requestMethod, {}, path,  filterParams);
					returnData.push.apply(returnData, responseData.Items);
				}

			}
		} 
		convertNETDates(returnData)
		return [this.helpers.returnJsonArray(returnData)];
	}
}




