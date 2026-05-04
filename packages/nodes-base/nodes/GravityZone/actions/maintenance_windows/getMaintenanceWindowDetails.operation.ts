import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions, wrapData } from '@utils/utilities';

import { gravityZoneApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName:
			'Documentation: <a href="https://www.bitdefender.com/business/support/en/77209-140029-getmaintenancewindowdetails.html" target="_blank" rel="noopener noreferrer">Get Maintenance Window Details</a>',
		name: 'getMaintenanceWindowDetailsDocsNotice',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'ID',
		name: 'id',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the queried maintenance window',
	},
];

const displayOptions = {
	show: { category: ['maintenance_windows'], action: ['getMaintenanceWindowDetails'] },
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const id = this.getNodeParameter('id', i) as string;

	const params = { id };

	const responseData = await gravityZoneApiRequest.call(
		this,
		'maintenanceWindows',
		'getMaintenanceWindowDetails',
		params,
	);

	return this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});
}
