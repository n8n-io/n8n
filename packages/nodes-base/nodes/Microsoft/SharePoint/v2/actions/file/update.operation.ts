import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../../utils/utilities';
import { fileRLC } from '../../file';
import { untilFolderSelected, folderRLC } from '../../folder';
import { getUploadBufferWithinCap, validateSharePointFileName } from '../../helpers/utils';
import { untilSiteSelected } from '../../list';
import { resolveSiteId, siteRLC } from '../../site';
import { microsoftApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		...siteRLC,
		description: 'Select the site the file lives in',
	},
	{
		...folderRLC,
		description: 'Select the folder the file lives in',
		displayOptions: {
			hide: {
				...untilSiteSelected,
			},
		},
	},
	{
		...fileRLC,
		description: 'Select the file to update',
		displayOptions: {
			hide: {
				...untilSiteSelected,
				...untilFolderSelected,
			},
		},
	},
	{
		displayName: 'Updated File Name',
		name: 'fileName',
		type: 'string',
		default: '',
		placeholder: 'e.g. report-v2.pdf',
		description: 'New name for the file. Leave empty to keep the current name.',
	},
	{
		displayName: 'Change File Content',
		name: 'changeFileContent',
		type: 'boolean',
		default: false,
		description: 'Whether to replace the file’s contents with the input binary data',
	},
	{
		displayName: 'Input Binary Field',
		name: 'binaryPropertyName',
		type: 'string',
		required: true,
		default: 'data',
		hint: 'The name of the input binary field containing the new file contents',
		displayOptions: {
			show: {
				changeFileContent: [true],
			},
		},
	},
];

const displayOptions = {
	show: {
		resource: ['file'],
		operation: ['update'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	i: number,
	siteIdCache?: Map<string, string>,
): Promise<IDataObject> {
	// https://learn.microsoft.com/en-us/graph/api/driveitem-update
	const fileId = (this.getNodeParameter('file', i, '', { extractValue: true }) as string).trim();
	const fileName = (this.getNodeParameter('fileName', i, '') as string).trim();
	const changeFileContent = this.getNodeParameter('changeFileContent', i, false) as boolean;

	// An empty segment would change the request shape — fail loudly instead.
	if (fileId === '') {
		throw new NodeOperationError(this.getNode(), "The 'File' parameter is empty", {
			description: 'Set the file ID and try again.',
		});
	}

	const wantRename = fileName !== '';
	if (wantRename) {
		validateSharePointFileName(this.getNode(), fileName, i);
	}
	if (!wantRename && !changeFileContent) {
		throw new NodeOperationError(this.getNode(), 'Nothing to update', {
			description: 'Set a new file name, enable Change File Content, or both.',
		});
	}

	// All local failures happen before any request — in particular before the
	// rename, so a bad payload can never leave a half-applied update.
	let content: { body: Buffer; contentType: string } | undefined;
	if (changeFileContent) {
		const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i);
		content = await getUploadBufferWithinCap(this, i, binaryPropertyName);
	}

	// resolveSiteId validates the site field itself, including the empty case
	const siteId = await resolveSiteId.call(this, i, siteIdCache);
	const itemPath = `/v1.0/sites/${encodeURIComponent(siteId)}/drive/items/${encodeURIComponent(fileId)}`;

	let response: IDataObject = {};
	if (wantRename) {
		response = await microsoftApiRequest.call(this, 'PATCH', itemPath, { name: fileName });
	}

	if (content) {
		try {
			response = await microsoftApiRequest.call(
				this,
				'PUT',
				`${itemPath}/content`,
				content.body,
				{},
				undefined,
				{ 'Content-Type': content.contentType },
			);
		} catch (error) {
			if (!wantRename) throw error;
			// A fresh string message is required here: wrapping the caught error
			// object would be discarded by NodeOperationError's pass-through when
			// the cause is itself a NodeOperationError.
			const cause = error instanceof Error ? error.message : String(error);
			throw new NodeOperationError(
				this.getNode(),
				`The file was renamed to "${fileName}", but replacing its contents failed: ${cause}`,
				{
					itemIndex: i,
					description:
						'The rename has already taken effect. Fix the content error and run the update again, leaving the file name empty to avoid renaming twice.',
				},
			);
		}
	}

	return response;
}
