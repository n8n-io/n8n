import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { folderRLC } from '../../descriptions';
import { decodeOutlookId } from '../../helpers/utils';
import { microsoftApiRequest } from '../../transport';

export const properties: INodeProperties[] = [
	folderRLC,
	{
		displayName: 'Name',
		name: 'displayName',
		description: 'Name of the folder',
		type: 'string',
		default: '',
		required: true,
	},
];

const displayOptions = {
	show: {
		resource: ['folder'],
		operation: ['update'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, index: number) {
	const folderId = decodeOutlookId(
		this.getNodeParameter('folderId', index, undefined, {
			extractValue: true,
		}) as string,
	);
	const displayName = this.getNodeParameter('displayName', index, undefined) as string;

	const responseData = await microsoftApiRequest.call(this, 'PATCH', `/mailFolders/${folderId}`, {
		displayName,
	});

	const executionData = this.helpers.constructExecutionMetaData(
		this.helpers.returnJsonArray(responseData as IDataObject),
		{ itemData: { item: index } },
	);

	return executionData;
}
