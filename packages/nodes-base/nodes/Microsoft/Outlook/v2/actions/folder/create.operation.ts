import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { folderRLC } from '../../descriptions';
import { decodeOutlookId } from '../../helpers/utils';
import { microsoftApiRequest } from '../../transport';

export const properties: INodeProperties[] = [
	{
		displayName: 'Name',
		name: 'displayName',
		description: 'Name of the folder',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. My Folder',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		options: [{ ...folderRLC, displayName: 'Parent Folder', required: false }],
	},
];

const displayOptions = {
	show: {
		resource: ['folder'],
		operation: ['create'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, index: number) {
	const displayName = this.getNodeParameter('displayName', index) as string;

	const folderId = decodeOutlookId(
		this.getNodeParameter('options.folderId', index, '', {
			extractValue: true,
		}) as string,
	);

	const body: IDataObject = {
		displayName,
	};

	let endpoint;

	if (folderId) {
		endpoint = `/mailFolders/${folderId}/childFolders`;
	} else {
		endpoint = '/mailFolders';
	}

	const responseData = await microsoftApiRequest.call(this, 'POST', endpoint, body);

	const executionData = this.helpers.constructExecutionMetaData(
		this.helpers.returnJsonArray(responseData as IDataObject[]),
		{ itemData: { item: index } },
	);

	return executionData;
}
