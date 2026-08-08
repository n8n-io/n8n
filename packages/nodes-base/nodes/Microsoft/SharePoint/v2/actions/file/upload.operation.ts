import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../../utils/utilities';
import { folderRLC } from '../../folder';
import { getUploadBufferWithinCap, validateSharePointFileName } from '../../helpers/utils';
import { untilSiteSelected } from '../../list';
import { resolveSiteId, siteRLC } from '../../site';
import { microsoftApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		...siteRLC,
		description: 'Select the site to upload to',
	},
	{
		...folderRLC,
		description: 'Select the folder to upload the file to',
		displayOptions: {
			hide: {
				...untilSiteSelected,
			},
		},
	},
	{
		displayName: 'File Name',
		name: 'fileName',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. report.pdf',
		description: 'Name the file will have in SharePoint',
	},
	{
		displayName: 'Input Binary Field',
		name: 'binaryPropertyName',
		type: 'string',
		required: true,
		default: 'data',
		hint: 'The name of the input binary field containing the file to upload',
	},
];

const displayOptions = {
	show: {
		resource: ['file'],
		operation: ['upload'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	i: number,
	siteIdCache?: Map<string, string>,
): Promise<IDataObject> {
	// https://learn.microsoft.com/en-us/graph/api/driveitem-put-content
	const fileName = this.getNodeParameter('fileName', i) as string;
	const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i);
	const folderId = (
		this.getNodeParameter('folder', i, '', { extractValue: true }) as string
	).trim();

	validateSharePointFileName(this.getNode(), fileName, i);

	if (folderId === '') {
		throw new NodeOperationError(this.getNode(), "The 'Parent Folder' parameter is empty", {
			description: "Set the folder ID (or 'root' for the library root) and try again.",
		});
	}

	const { body, contentType } = await getUploadBufferWithinCap(this, i, binaryPropertyName);

	const siteId = await resolveSiteId.call(this, i, siteIdCache);

	// Encode segments: site IDs contain commas and file names spaces; encoding
	// also keeps user input from escaping its path segment under either credential.
	return await microsoftApiRequest.call(
		this,
		'PUT',
		`/v1.0/sites/${encodeURIComponent(siteId)}/drive/items/${encodeURIComponent(folderId)}:/${encodeURIComponent(fileName)}:/content`,
		body,
		{},
		undefined,
		{ 'Content-Type': contentType },
	);
}
