import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { googleApiRequest } from '../../transport';
import { fileRLC } from '../common.descriptions';

const properties: INodeProperties[] = [
	{
		...fileRLC,
		description: 'The file to delete',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		options: [
			{
				displayName: 'Delete Permanently',
				name: 'deletePermanently',
				type: 'boolean',
				default: false,
				description:
					'Whether to delete the file immediately. If false, the file will be moved to the trash.',
			},
		],
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

	const deletePermanently = this.getNodeParameter('options.deletePermanently', i, false) as boolean;

	const qs = {
		supportsAllDrives: true,
	};

	if (deletePermanently) {
		await googleApiRequest.call(this, 'DELETE', `/drive/v3/files/${fileId}`, undefined, qs);
	} else {
		await googleApiRequest.call(this, 'PATCH', `/drive/v3/files/${fileId}`, { trashed: true }, qs);
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
