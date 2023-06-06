import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../../utils/utilities';
import { fileRLC, folderRLC } from '../common.descriptions';
import { googleApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		...fileRLC,
		description: 'The file to move',
	},
	{
		...folderRLC,
		displayName: 'Destination Folder',
		name: 'destinationFolderId',
		description: 'The folder where you want to move the file',
	},
];

const displayOptions = {
	show: {
		resource: ['file'],
		operation: ['move'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const fileId = this.getNodeParameter('fileId', i, undefined, {
		extractValue: true,
	});

	const destinationFolderId = this.getNodeParameter('destinationFolderId', i, undefined, {
		extractValue: true,
	});

	const { parents } = await googleApiRequest.call(
		this,
		'GET',
		`/drive/v3/files/${fileId}`,
		undefined,
		{
			fields: 'parents',
		},
	);

	const response = await googleApiRequest.call(
		this,
		'PATCH',
		`/drive/v3/files/${fileId}`,
		undefined,
		{
			addParents: destinationFolderId,
			removeParents: ((parents as string[]) || []).join(','),
		},
	);

	const executionData = this.helpers.constructExecutionMetaData(
		this.helpers.returnJsonArray(response as IDataObject[]),
		{ itemData: { item: i } },
	);

	return executionData;
}
