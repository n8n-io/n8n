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
	ouraApiRequest,
} from './GenericFunctions';

import {
	profileFields,
	profileOperations,
} from './ProfileDescription';

import {
	summaryFields,
	summaryOperations,
} from './SummaryDescription';

export class Oura implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Oura',
		name: 'oura',
		icon: 'file:oura.png',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Oura API',
		defaults: {
			name: 'Oura',
			color: '#00ade8',
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
				description: 'Resource to consume.',
			},
			// PROFILE
			...profileOperations,
			...profileFields,
			// SUMMARY
			...summaryOperations,
			...summaryFields
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
			if (resource === 'profile') {
				if (operation === 'get') {
					responseData = await ouraApiRequest.call(this, 'GET', `/userinfo`);
				}
			}
			if (resource === 'summary') {
				const start = this.getNodeParameter('start', i) as string;
				const end = this.getNodeParameter('end', i) as string;

				qs.start = start;
				qs.end = end;

				if (operation === 'getSleep') {
					responseData = await ouraApiRequest.call(this, 'GET', `/sleep`, {}, qs);
					responseData = responseData.sleep;
				}
				if (operation === 'getActivity') {
					responseData = await ouraApiRequest.call(this, 'GET', `/activity`, {}, qs);
					responseData = responseData.activity;
				}
				if (operation === 'getReadiness') {
					responseData = await ouraApiRequest.call(this, 'GET', `/readiness`, {}, qs);
					responseData = responseData.readiness;
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
