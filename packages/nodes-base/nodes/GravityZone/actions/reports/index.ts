import type { INodeProperties } from 'n8n-workflow';

import * as createReport from './createReport.operation';
import * as deleteReport from './deleteReport.operation';
import * as getDownloadLinks from './getDownloadLinks.operation';
import * as getReportsList from './getReportsList.operation';

export { createReport, deleteReport, getDownloadLinks, getReportsList };

export const description: INodeProperties[] = [
	{
		displayName: 'Action',
		name: 'action',
		type: 'options',
		noDataExpression: true,
		required: true,
		displayOptions: { show: { category: ['reports'] } },
		options: [
			{
				name: 'Create Report',
				value: 'createReport',
				action: 'Create a new report',
			},
			{
				name: 'Delete Report',
				value: 'deleteReport',
				action: 'Delete a report',
			},
			{
				name: 'Get Download Links',
				value: 'getDownloadLinks',
				action: 'Get download links for a report',
			},
			{
				name: 'Get Reports List',
				value: 'getReportsList',
				action: 'Get list of reports',
			},
		],
		default: 'getReportsList',
	},
	...createReport.description,
	...deleteReport.description,
	...getDownloadLinks.description,
	...getReportsList.description,
];
