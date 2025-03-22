import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { googleApiRequest } from '../../transport';
import { folderNoRootRLC } from '../common.descriptions';

const properties: INodeProperties[] = [
	{
		...folderNoRootRLC,
		description: 'The folder to delete',
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
					'Whether to delete the folder immediately. If false, the folder will be moved to the trash.',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['folder'],
		operation: ['deleteFolder'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];

	const folderId = this.getNodeParameter('folderNoRootId', i, undefined, {
		extractValue: true,
	}) as string;

	const deletePermanently = this.getNodeParameter('options.deletePermanently', i, false) as boolean;

	const qs = {
		supportsAllDrives: true,
	};

	if (deletePermanently) {
		await googleApiRequest.call(this, 'DELETE', `/drive/v3/files/${folderId}`, undefined, qs);
	} else {
		await googleApiRequest.call(
			this,
			'PATCH',
			`/drive/v3/files/${folderId}`,
			{ trashed: true },
			qs,
		);
	}

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
