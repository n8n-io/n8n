import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

import { questionsFields, questionsOperations } from './QuestionsDescription';

import { metricsFields, metricsOperations } from './MetricsDescription';

import { databasesFields, databasesOperations } from './DatabasesDescription';

import { alertsFields, alertsOperations } from './AlertsDescription';

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
		inputs: ['main'],
		outputs: ['main'],
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
