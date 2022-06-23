import {
	ILoadOptionsFunctions,
	INodeProperties,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { contactFields, contactOperations } from './description/ContactDescription';
import { opportunityFields, opportunityOperations } from './description/OpportunityDescription';
import { pipelineFields, pipelineOperations } from './description/PipelineDescription';
import { taskFields, taskOperations } from './description/TaskDescription';
import { highLevelApiPagination, highLevelApiRequest, wait } from './GenericFunctions';


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
			pagination: highLevelApiPagination,
		},
		properties: [
			...ressources,
			...contactOperations,
			...contactFields,
			...opportunityOperations,
			...opportunityFields,
			...pipelineOperations,
			...pipelineFields,
			...taskOperations,
			...taskFields,
		],
	};

	methods = {
		loadOptions: {
			async getPipelineStages(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const pipelineId = this.getCurrentNodeParameter('pipelineId') as string;
				const responseData = await highLevelApiRequest.call(this, 'GET', '/pipelines');
				const pipelines = responseData.pipelines as [{ id: string, stages: [{ id: string, name: string }] }];
				const pipeline = pipelines.find(p => p.id === pipelineId);
				if (pipeline) {
					const options: INodePropertyOptions[] = pipeline.stages.map(stage => {
						const name = stage.name;
						const value = stage.id;
						return { name, value };
					})
					return options;
				}
				return []
			},
		},
	};
}
