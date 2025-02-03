import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { googleApiRequest } from '../../transport';
import { sharedDriveRLC } from '../common.descriptions';

const properties: INodeProperties[] = [
	{
		...sharedDriveRLC,
		description: 'The shared drive to delete',
	},
];

const displayOptions = {
	show: {
		resource: ['drive'],
		operation: ['deleteDrive'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];

	const driveId = this.getNodeParameter('driveId', i, undefined, {
		extractValue: true,
	}) as string;

	await googleApiRequest.call(this, 'DELETE', `/drive/v3/drives/${driveId}`);

	const executionData = this.helpers.constructExecutionMetaData(
		this.helpers.returnJsonArray({ success: true }),
		{ itemData: { item: i } },
	);

	returnData.push(...executionData);

	return returnData;
}
