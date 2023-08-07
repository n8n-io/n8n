import type {
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { ouraApiRequest } from './GenericFunctions';

import { profileOperations } from './ProfileDescription';

import { summaryFields, summaryOperations } from './SummaryDescription';

import moment from 'moment';

export class Oura implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Oura',
		name: 'oura',
		icon: 'file:oura.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Oura API',
		defaults: {
			name: 'Oura',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'ouraApi',
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
						name: 'Profile',
						value: 'profile',
					},
					{
						name: 'Summary',
						value: 'summary',
					},
				],
				default: 'summary',
			},
			...profileOperations,
			...summaryOperations,
			...summaryFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const length = items.length;

		let responseData;
		const returnData: IDataObject[] = [];

		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);

		for (let i = 0; i < length; i++) {
			if (resource === 'profile') {
				// *********************************************************************
				//                             profile
				// *********************************************************************

				// https://cloud.ouraring.com/docs/personal-info

				if (operation === 'get') {
					// ----------------------------------
					//         profile: get
					// ----------------------------------

					responseData = await ouraApiRequest.call(this, 'GET', '/userinfo');
				}
			} else if (resource === 'summary') {
				// *********************************************************************
				//                             summary
				// *********************************************************************

				// https://cloud.ouraring.com/docs/daily-summaries

				const qs: IDataObject = {};

				const { start, end } = this.getNodeParameter('filters', i) as {
					start: string;
					end: string;
				};

				const returnAll = this.getNodeParameter('returnAll', 0);

				if (start) {
					qs.start = moment(start).format('YYYY-MM-DD');
				}

				if (end) {
					qs.end = moment(end).format('YYYY-MM-DD');
				}

				if (operation === 'getActivity') {
					// ----------------------------------
					//       profile: getActivity
					// ----------------------------------

					responseData = await ouraApiRequest.call(this, 'GET', '/activity', {}, qs);
					responseData = responseData.activity;

					if (!returnAll) {
						const limit = this.getNodeParameter('limit', 0);
						responseData = responseData.splice(0, limit);
					}
				} else if (operation === 'getReadiness') {
					// ----------------------------------
					//       profile: getReadiness
					// ----------------------------------

					responseData = await ouraApiRequest.call(this, 'GET', '/readiness', {}, qs);
					responseData = responseData.readiness;

					if (!returnAll) {
						const limit = this.getNodeParameter('limit', 0);
						responseData = responseData.splice(0, limit);
					}
				} else if (operation === 'getSleep') {
					// ----------------------------------
					//         profile: getSleep
					// ----------------------------------

					responseData = await ouraApiRequest.call(this, 'GET', '/sleep', {}, qs);
					responseData = responseData.sleep;

					if (!returnAll) {
						const limit = this.getNodeParameter('limit', 0);
						responseData = responseData.splice(0, limit);
					}
				}
			}

			Array.isArray(responseData)
				? returnData.push(...(responseData as IDataObject[]))
				: returnData.push(responseData as IDataObject);
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
