import type { IExecuteFunctions } from 'n8n-core';
import type { INodeExecutionData, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../../utils/utilities';
import { googleApiRequest } from '../../transport';
import { folderRLC } from '../common.descriptions';

const properties: INodeProperties[] = [folderRLC];

const displayOptions = {
	show: {
		resource: ['folder'],
		operation: ['deleteFolder'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];

	const folderId = this.getNodeParameter('folderId', i, undefined, {
		extractValue: true,
	}) as string;

	await googleApiRequest.call(
		this,
		'DELETE',
		`/drive/v3/files/${folderId}`,
		{},
		{ supportsTeamDrives: true },
	);

	// If we are still here it did succeed
	const executionData = this.helpers.constructExecutionMetaData(
		this.helpers.returnJsonArray({
			fileId: folderId,
			success: true,
		}),
		{ itemData: { item: i } },
	);

	returnData.push(...executionData);

	return returnData;
}
