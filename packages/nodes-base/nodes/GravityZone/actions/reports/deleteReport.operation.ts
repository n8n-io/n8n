import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions, wrapData } from '@utils/utilities';

import { gravityZoneApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName:
			'Documentation: <a href="https://www.bitdefender.com/business/support/en/77209-135317-deletereport.html" target="_blank" rel="noopener noreferrer">Delete Report</a>',
		name: 'deleteReportDocsNotice',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'Report ID',
		name: 'reportId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the report to delete',
	},
];

const displayOptions = { show: { category: ['reports'], action: ['deleteReport'] } };

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const reportId = this.getNodeParameter('reportId', i) as string;

	const params = { reportId };

	const responseData = await gravityZoneApiRequest.call(this, 'reports', 'deleteReport', params);

	return this.helpers.constructExecutionMetaData(wrapData(responseData), { itemData: { item: i } });
}
