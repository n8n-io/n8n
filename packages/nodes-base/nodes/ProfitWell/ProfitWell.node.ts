import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	profitWellApiRequest,
} from './GenericFunctions';

import {
	companyOperations,
} from './CompanyDescription';

import {
	metricsFields,
	metricsOperations,
} from './MetricsDescription';

export class ProfitWell implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'ProfitWell',
		name: 'profitWell',
		icon: 'file:profitwell.png',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume ProfitWell API',
		defaults: {
			name: 'ProfitWell',
			color: '#1e333d',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'profitWellApi',
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
						name: 'Company',
						value: 'company',
					},
					{
						name: 'Metrics',
						value: 'metrics',
					},
				],
				default: 'metrics',
				description: 'Resource to consume.',
			},
			// COMPANY
			...companyOperations,
			// METRICS
			...metricsOperations,
			...metricsFields,
		],
	};

	methods = {
		loadOptions: {
			async getPlanIds(
				this: ILoadOptionsFunctions,
			): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const planIds = await profitWellApiRequest.call(
					this,
					'GET',
					'/metrics/plans',
				);
				for (const planId of planIds.plan_ids) {
					returnData.push({
						name: planId,
						value: planId,
					});
				}
				return returnData;
			},
		},
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
			if (resource === 'company') {
				responseData = await profitWellApiRequest.call(this, 'GET', `/company/settings/`);
			}
			if (resource === 'metrics') {
				if (operation === 'getDailyMetrics') {
					const options = this.getNodeParameter('options', i) as IDataObject;
					Object.assign(qs, options);
					qs.month = this.getNodeParameter('month', i) as string;

					responseData = await profitWellApiRequest.call(this, 'GET', `/metrics/daily`, {}, qs);
					responseData = responseData.data;
				}
				if (operation === 'getMonthlyMetrics') {
					const options = this.getNodeParameter('options', i) as IDataObject;
					Object.assign(qs, options);

					responseData = await profitWellApiRequest.call(this, 'GET', `/metrics/monthly`, {}, qs);
					responseData = responseData.data;
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
