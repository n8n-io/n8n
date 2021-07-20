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
	simplifyDailyMetrics,
	simplifyMontlyMetrics,
} from './GenericFunctions';

import {
	companyOperations,
} from './CompanyDescription';

import {
	metricFields,
	metricOperations,
} from './MetricDescription';

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
						name: 'Metric',
						value: 'metric',
					},
				],
				default: 'metric',
				description: 'Resource to consume.',
			},
			// COMPANY
			...companyOperations,
			// METRICS
			...metricOperations,
			...metricFields,
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
			try {
				if (resource === 'company') {
					if (operation === 'getSetting') {
						responseData = await profitWellApiRequest.call(this, 'GET', `/company/settings/`);
					}
				}
				if (resource === 'metric') {
					if (operation === 'get') {
						const type = this.getNodeParameter('type', i) as string;

						const simple = this.getNodeParameter('simple', 0) as boolean;

						if (type === 'daily') {
							qs.month = this.getNodeParameter('month', i) as string;
						}
						const options = this.getNodeParameter('options', i) as IDataObject;

						Object.assign(qs, options);

						if (qs.dailyMetrics) {
							qs.metrics = (qs.dailyMetrics as string[]).join(',');
							delete qs.dailyMetrics;
						}

						if (qs.monthlyMetrics) {
							qs.metrics = (qs.monthlyMetrics as string[]).join(',');
							delete qs.monthlyMetrics;
						}

						responseData = await profitWellApiRequest.call(this, 'GET', `/metrics/${type}`, {}, qs);
						responseData = responseData.data;

						if (simple === true) {
							if (type === 'daily') {
								responseData = simplifyDailyMetrics(responseData);
							} else {
								responseData = simplifyMontlyMetrics(responseData);
							}
						}
					}
				}
				if (Array.isArray(responseData)) {
					returnData.push.apply(returnData, responseData as IDataObject[]);
				} else {
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
