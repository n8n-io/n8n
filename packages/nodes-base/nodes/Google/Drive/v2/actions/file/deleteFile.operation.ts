import type { IExecuteFunctions } from 'n8n-core';
import type { INodeExecutionData, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../../utils/utilities';
import { googleApiRequest } from '../../transport';
import { fileRLC } from '../common.descriptions';

const properties: INodeProperties[] = [
	fileRLC,
	{
		displayName: 'Delete Permanently',
		name: 'deletePermanently',
		type: 'boolean',
		default: false,
		description:
			'Whether to delete the file immediately. If false, the file will be moved to the trash.',
	},
];

const displayOptions = {
	show: {
		resource: ['file'],
		operation: ['deleteFile'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const fileId = this.getNodeParameter('fileId', i, undefined, {
		extractValue: true,
	}) as string;

	const deletePermanently = this.getNodeParameter('deletePermanently', i, false) as boolean;

	if (deletePermanently) {
		await googleApiRequest.call(this, 'DELETE', `/drive/v3/files/${fileId}`, undefined, {
			supportsAllDrives: true,
		});
	} else {
		await googleApiRequest.call(
			this,
			'PATCH',
			`/drive/v3/files/${fileId}`,
			{ trashed: true },
			{
				supportsAllDrives: true,
			},
		);
	}

	const executionData = this.helpers.constructExecutionMetaData(
		this.helpers.returnJsonArray({
			id: fileId,
			success: true,
		}),
		{ itemData: { item: i } },
	);

	return executionData;
}
