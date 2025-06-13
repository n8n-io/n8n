import type { INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { alertsFields, alertsOperations } from './AlertsDescription';
import { databasesFields, databasesOperations } from './DatabasesDescription';
import { metricsFields, metricsOperations } from './MetricsDescription';
import { questionsFields, questionsOperations } from './QuestionsDescription';

export class Metabase implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Metabase',
		name: 'metabase',
		icon: 'file:metabase.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Use the Metabase API',
		defaults: {
			name: 'Metabase',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'metabaseApi',
				required: true,
			},
		],
		requestDefaults: {
			returnFullResponse: true,
			baseURL: '={{$credentials.url.replace(new RegExp("/$"), "")}}',
			headers: {},
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Alert',
						value: 'alerts',
					},
					{
						name: 'Database',
						value: 'databases',
					},
					{
						name: 'Metric',
						value: 'metrics',
					},
					{
						name: 'Question',
						value: 'questions',
					},
				],
				default: 'questions',
			},
			...questionsOperations,
			...questionsFields,
			...metricsOperations,
			...metricsFields,
			...databasesOperations,
			...databasesFields,
			...alertsOperations,
			...alertsFields,
		],
	};
}
