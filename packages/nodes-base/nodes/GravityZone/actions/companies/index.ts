import type { INodeProperties } from 'n8n-workflow';

import * as getCompanyDetails from './getCompanyDetails.operation';
import * as updateCompanyDetails from './updateCompanyDetails.operation';

export { getCompanyDetails, updateCompanyDetails };

export const description: INodeProperties[] = [
	{
		displayName: 'Action',
		name: 'action',
		type: 'options',
		noDataExpression: true,
		required: true,
		default: 'getCompanyDetails',
		displayOptions: {
			show: {
				category: ['companies'],
			},
		},
		options: [
			{
				name: 'Get Details',
				value: 'getCompanyDetails',
				action: 'Get company details',
			},
			{
				name: 'Update Details',
				value: 'updateCompanyDetails',
				action: 'Update company details',
			},
		],
	},
	...getCompanyDetails.description,
	...updateCompanyDetails.description,
];
