import {
	type IDataObject,
	type IExecuteFunctions,
	type INodeProperties,
	NodeOperationError,
} from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../utils/utilities';
import { resolveBinaryUpload } from '../../helpers/fileTransfer';
import type { MondayGraphQLClient } from '../../transport/MondayGraphQLClient';

const properties: INodeProperties[] = [
	{
		displayName: 'Update ID',
		name: 'updateId',
		type: 'string',
		default: '',
		required: true,
		description: 'The ID of the update to attach the file to',
	},
	{
		displayName: 'Input Binary Field',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		required: true,
		hint: 'The name of the input binary field containing the file to upload',
	},
];

const displayOptions = {
	show: {
		resource: ['update'],
		operation: ['addFileToUpdate'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

/**
 * Update: Add File — add_file_to_update through the /v2/file multipart
 * endpoint, taking the file from an input binary field.
 */
export async function execute(
	this: IExecuteFunctions,
	client: MondayGraphQLClient,
	itemIndex: number,
): Promise<IDataObject> {
	const updateId = (this.getNodeParameter('updateId', itemIndex) as string).trim();
	const binaryPropertyName = this.getNodeParameter('binaryPropertyName', itemIndex) as string;

	// The update ID is inlined into the mutation (the file endpoint only
	// supports the $file variable) — enforce numeric to keep the query intact.
	if (!/^\d+$/.test(updateId)) {
		throw new NodeOperationError(this.getNode(), 'Update ID must be a number', { itemIndex });
	}

	// Streamed from binary storage when possible — monday accepts files up
	// to 500 MB, which must not be buffered in memory.
	const upload = await resolveBinaryUpload(this, itemIndex, binaryPropertyName);

	const data = await client.uploadFile(
		`mutation ($file: File!) {
			add_file_to_update(update_id: ${updateId}, file: $file) {
				id
				name
				url
				public_url
				file_extension
				file_size
			}
		}`,
		upload.body,
		upload.fileName,
		upload.mimeType,
		upload.contentLength,
	);

	return (data.add_file_to_update ?? {}) as IDataObject;
}
