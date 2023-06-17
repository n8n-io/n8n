import type { INodeProperties } from 'n8n-workflow';
import * as getga4 from './get.ga4.operation';
import * as getuniversal from './get.universal.operation';

export { getga4, getuniversal };

export const description: INodeProperties[] = [
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
		name: 'propertyType',
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
	...getga4.description,
	...getuniversal.description,
];
