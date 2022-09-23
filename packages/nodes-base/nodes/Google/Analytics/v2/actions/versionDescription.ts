import { INodeTypeDescription } from 'n8n-workflow';
import { reportGA4Fields } from './descriptions/ReportGA4Description';
import { reportUAFields } from './descriptions/ReportUADescription';

import * as userActivity from './userActivity/UserActivity.resource';

export const versionDescription: INodeTypeDescription = {
	displayName: 'Google Analytics',
	name: 'googleAnalytics',
	icon: 'file:analytics.svg',
	group: ['transform'],
	version: 2,
	subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
	description: 'Use the Google Analytics API',
	defaults: {
		name: 'Google Analytics',
	},
	inputs: ['main'],
	outputs: ['main'],
	credentials: [
		{
			name: 'googleAnalyticsOAuth2',
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
					name: 'Report',
					value: 'report',
				},
				{
					name: 'User Activity',
					value: 'userActivity',
				},
			],
			default: 'report',
		},
		{
			displayName: 'Operation',
			name: 'operation',
			type: 'options',
			noDataExpression: true,
			displayOptions: {
				show: {
					resource: ['report'],
				},
			},
			options: [
				{
					name: 'Get',
					value: 'get',
					description: 'Return the analytics data',
					action: 'Get a report',
				},
			],
			default: 'get',
		},
		{
			displayName: 'Property Type',
			name: 'accessDataFor',
			type: 'options',
			noDataExpression: true,
			description:
				'Google Analytics 4 is the latest version. Universal Analytics is an older version that is not fully functional after the end of June 2023.',
			options: [
				{
					name: 'Google Analytics 4',
					value: 'ga4',
				},
				{
					name: 'Universal Analytics',
					value: 'universal',
				},
			],
			default: 'ga4',
			displayOptions: {
				show: {
					resource: ['report'],
					operation: ['get'],
				},
			},
		},

		...reportGA4Fields,
		...reportUAFields,
		...userActivity.description,
	],
};
