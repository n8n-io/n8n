import type { IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { folderRLC } from '../../descriptions';
import { executeDeletion } from '../../helpers/delete';
import { decodeOutlookId } from '../../helpers/utils';

export const properties: INodeProperties[] = [
	folderRLC,
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		options: [
			{
				displayName: 'Permanent Delete',
				name: 'permanentDelete',
				type: 'boolean',
				default: false,
				description:
					"Permanently delete a mail folder and remove its items from the user's mailbox. Folders aren't placed in the purges folder when they're permanently deleted.",
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['folder'],
		operation: ['delete'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, index: number) {
	const folderId = decodeOutlookId(
		this.getNodeParameter('folderId', index, undefined, {
			extractValue: true,
		}) as string,
	);

	await executeDeletion.call(this, index, `/mailFolders/${folderId}`);

	const executionData = this.helpers.constructExecutionMetaData(
		this.helpers.returnJsonArray({ success: true }),
		{ itemData: { item: index } },
	);

	return executionData;
}
