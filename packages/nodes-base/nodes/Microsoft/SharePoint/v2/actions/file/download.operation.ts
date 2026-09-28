import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../../utils/utilities';
import { fileRLC } from '../../file';
import { untilFolderSelected, folderRLC } from '../../folder';
import { untilSiteSelected } from '../../list';
import { resolveSiteId, siteRLC } from '../../site';
import { microsoftApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		...siteRLC,
		description: 'Select the site to download from',
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
		description: 'Select the file to download',
		displayOptions: {
			hide: {
				...untilSiteSelected,
				...untilFolderSelected,
			},
		},
	},
	{
		displayName: 'Put Output File in Field',
		name: 'binaryPropertyName',
		type: 'string',
		required: true,
		default: 'data',
		hint: 'The name of the output binary field to put the file in',
	},
];

const displayOptions = {
	show: {
		resource: ['file'],
		operation: ['download'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

type DriveItemReply = IDataObject & {
	name?: string;
	file?: { mimeType?: string };
	'@microsoft.graph.downloadUrl'?: string;
};

export async function execute(
	this: IExecuteFunctions,
	i: number,
	siteIdCache?: Map<string, string>,
): Promise<INodeExecutionData> {
	// https://learn.microsoft.com/en-us/graph/api/driveitem-get-content
	const fileId = (this.getNodeParameter('file', i, '', { extractValue: true }) as string).trim();
	const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i);

	// An empty segment would change the request shape — fail loudly instead.
	if (fileId === '') {
		throw new NodeOperationError(this.getNode(), "The 'File' parameter is empty", {
			description: 'Set the file ID and try again.',
		});
	}

	// resolveSiteId validates the site field itself, including the empty case
	const siteId = await resolveSiteId.call(this, i, siteIdCache);

	// One metadata GET yields the filename, the mime type, and the pre-authorized
	// download link (returned by default, no $select).
	const metadata = (await microsoftApiRequest.call(
		this,
		'GET',
		`/v1.0/sites/${encodeURIComponent(siteId)}/drive/items/${encodeURIComponent(fileId)}`,
	)) as DriveItemReply;

	if (metadata.file === undefined) {
		throw new NodeOperationError(this.getNode(), 'The selected item is not a file', {
			description: "Check the value in the 'File' parameter — folders can't be downloaded.",
		});
	}
	const downloadUrl = metadata['@microsoft.graph.downloadUrl'];
	if (!downloadUrl) {
		throw new NodeOperationError(this.getNode(), 'This file has no downloadable content', {
			description: 'Microsoft Graph did not provide a download link for this item.',
		});
	}

	// The link is pre-authorized and lives on a different origin — sign-in
	// details must never be forwarded to it (that would leak the token and get
	// the request rejected; the transport's same-origin guard would refuse the
	// URL anyway), so the content is fetched plainly, with no credential.
	let response;
	try {
		response = await this.helpers.httpRequest({
			method: 'GET',
			url: downloadUrl,
			returnFullResponse: true,
			encoding: 'arraybuffer',
			json: false,
		});
	} catch (error) {
		// A raw failure here would carry the request config — pre-authorized
		// link included — into stored execution data, so only the message survives.
		const cause = error instanceof Error ? error.message : String(error);
		throw new NodeOperationError(this.getNode(), `Downloading the file contents failed: ${cause}`, {
			itemIndex: i,
			description: 'The download link may have expired. Run the node again to fetch a fresh one.',
		});
	}

	const binaryData = await this.helpers.prepareBinaryData(
		response.body as Buffer,
		metadata.name,
		metadata.file.mimeType ?? (response.headers['content-type'] as string | undefined),
	);

	// v1 output parity: an empty json object with the file under the binary key
	return { json: {}, binary: { [binaryPropertyName]: binaryData } };
}
