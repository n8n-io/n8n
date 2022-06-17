import {
	IDataObject,
	IExecutePaginationFunctions,
	INodeExecutionData,
	INodeProperties,
	INodeType,
	INodeTypeDescription,
	IRequestOptionsFromParameters,
} from 'n8n-workflow';

import { contactFields, contactOperations } from './description/ContactDescription';
import { opportunityFields, opportunityOperations } from './description/OpportunityDescription';
import { pipelineFields, pipelineOperations } from './description/PipelineDescription';
import { wait } from './GenericFunctions';


const ressources: INodeProperties[] = [
	{
		displayName: 'Resource',
		name: 'resource',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Contact',
				value: 'contact',
			},
			{
				name: 'Opportunity',
				value: 'opportunity',
			},
			{
				name: 'Pipeline',
				value: 'pipeline',
			},
			{
				name: 'Task',
				value: 'task',
			},
		],
		default: 'contact',
		required: true,
	},
]

export class HighLevel implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'HighLevel',
		name: 'highLevel',
		icon: 'file:highLevel.svg',
		group: ['transform'],
		version: 1,
		description: 'Consume HighLevel API',
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		defaults: {
			name: 'HighLevel',
			color: '#f1be40',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'highLevelApi',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: 'https://rest.gohighlevel.com/v1',
			headers: {
				'Accept': 'application/json',
				'Content-Type': 'application/json',
			},
		},
		requestOperations: {
			async pagination(this: IExecutePaginationFunctions, requestData: IRequestOptionsFromParameters): Promise<INodeExecutionData[]> {

				let rootProperty = '';
				requestData.postReceive.forEach(pR => {
					for (let i = 0; i < pR.actions.length; i++) {
						const action: any = pR.actions[i];
						if (action.type === 'rootProperty') {
							rootProperty = action.properties.property
							pR.actions.splice(i, 1);
							break;
						}
					}
				});

				const responseData: INodeExecutionData[] = [];
				const returnAll = this.getNodeParameter('returnAll');
				let responseTotal = 0;

				do {

					console.log(requestData.options);

					const pageResponseData: INodeExecutionData[] = await this.makeRoutingRequest(requestData);
					const items = pageResponseData[0].json[rootProperty] as [];
					items.forEach(item => responseData.push({ json: item }));

					const meta = pageResponseData[0].json.meta as IDataObject;
					const startAfterId = meta?.startAfterId as string;
					const startAfter = meta?.startAfter as number;
					requestData.options.qs = { startAfterId, startAfter };
					responseTotal = meta?.total as number || 0;

					// console.log(JSON.stringify(meta, null, 2));
					// await wait();

				} while (returnAll && responseTotal > responseData.length)

				return responseData;
			},
		},
		properties: [
			...ressources,
			...contactOperations,
			...contactFields,
			...opportunityOperations,
			...opportunityFields,
			...pipelineOperations,
			...pipelineFields,
		],
	};
}
