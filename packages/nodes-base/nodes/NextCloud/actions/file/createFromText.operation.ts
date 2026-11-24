import type { IDataObject, IExecuteFunctions, INodeProperties, RequestPath } from 'n8n-workflow';
import { NodeApiError, NodeOperationError, requestPath } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import {
	nextCloudApiRequest,
	readMultistatus,
	readProps,
	webDavPath,
} from '../../GenericFunctions';

const properties: INodeProperties[] = [
	{
		displayName: 'File Content',
		name: 'content',
		type: 'string',
		default: '',
		typeOptions: {
			rows: 4,
		},
		description: 'The text to write to the file',
	},
	{
		displayName: 'File Name',
		name: 'fileName',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'e.g. notes.txt',
		description: 'The name of the new file, with its extension',
	},
	{
		displayName: 'Parent Folder',
		name: 'parentFolder',
		type: 'string',
		default: '/',
		placeholder: 'e.g. /invoices/2019',
		description: 'The path of the folder to create the file in. The folder has to exist.',
	},
	{
		displayName: 'If File Exists',
		name: 'ifFileExists',
		type: 'options',
		default: 'fail',
		options: [
			{
				name: 'Add Suffix',
				value: 'addSuffix',
				description:
					'Keep the existing file and save the new one with the current UTC time after the name, like "notes 2026-11-24T10-15-30.123Z.txt"',
			},
			{
				name: 'Fail',
				value: 'fail',
				description: 'Stop with an error and keep the existing file',
			},
			{
				name: 'Overwrite',
				value: 'overwrite',
				description: 'Replace the existing file',
			},
		],
		description: 'What to do when the folder already has a file with this name',
	},
];

const displayOptions = {
	show: {
		resource: ['file'],
		operation: ['createFromText'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

const PROPFIND_BODY = `<?xml version="1.0"?>
<d:propfind xmlns:d="DAV:" xmlns:oc="http://owncloud.org/ns">
  <d:prop><oc:fileid/><d:getetag/><d:getlastmodified/><d:getcontentlength/><d:getcontenttype/></d:prop>
</d:propfind>`;

export function nameWithTimestamp(fileName: string, date: Date) {
	// Windows file names cannot contain colons
	const timestamp = date.toISOString().replace(/:/g, '-');
	const dot = fileName.lastIndexOf('.');
	return dot > 0
		? `${fileName.slice(0, dot)} ${timestamp}${fileName.slice(dot)}`
		: `${fileName} ${timestamp}`;
}

async function putIfNew(this: IExecuteFunctions, endpoint: RequestPath, content: string) {
	try {
		// Nextcloud answers 412 to this header when the file already exists
		await nextCloudApiRequest.call(this, 'PUT', endpoint, content, { 'If-None-Match': '*' });
		return true;
	} catch (error) {
		if (error instanceof NodeApiError && error.httpCode === '412') return false;
		throw error;
	}
}

const OUTPUT_PROPS = {
	fileId: 'oc:fileid',
	eTag: 'd:getetag',
	lastModified: 'd:getlastmodified',
	contentLength: 'd:getcontentlength',
	contentType: 'd:getcontenttype',
};

export async function execute(this: IExecuteFunctions, i: number): Promise<IDataObject> {
	const content = this.getNodeParameter('content', i, '') as string;
	const fileName = this.getNodeParameter('fileName', i) as string;
	const parentFolder = (this.getNodeParameter('parentFolder', i, '/') as string).replace(
		/\/+$/,
		'',
	);
	const ifFileExists = this.getNodeParameter('ifFileExists', i) as
		| 'addSuffix'
		| 'fail'
		| 'overwrite';

	if (fileName.includes('/')) {
		throw new NodeOperationError(this.getNode(), 'The file name cannot contain "/"', {
			itemIndex: i,
			description: 'Put the folder path in "Parent Folder".',
		});
	}

	const folder = webDavPath(parentFolder);
	const endpoint = requestPath`${folder}/${fileName}`;
	let writtenName = fileName;

	if (ifFileExists === 'overwrite') {
		await nextCloudApiRequest.call(this, 'PUT', endpoint, content);
	} else if (!(await putIfNew.call(this, endpoint, content))) {
		if (ifFileExists === 'fail') {
			throw new NodeOperationError(
				this.getNode(),
				`The file "${parentFolder}/${fileName}" already exists`,
				{
					itemIndex: i,
					description:
						'Set "If File Exists" to "Overwrite" to replace it, or to "Add Suffix" to keep both files.',
				},
			);
		}

		writtenName = nameWithTimestamp(fileName, new Date());
		if (!(await putIfNew.call(this, requestPath`${folder}/${writtenName}`, content))) {
			throw new NodeOperationError(
				this.getNode(),
				`The file "${parentFolder}/${writtenName}" already exists`,
				{ itemIndex: i },
			);
		}
	}

	const path = `${parentFolder}/${writtenName}`;

	// A PUT response has no body, so read the new file's metadata separately
	const [response] = await readMultistatus(
		await nextCloudApiRequest.call(
			this,
			'PROPFIND',
			requestPath`${folder}/${writtenName}`,
			PROPFIND_BODY,
			{ 'Content-Type': 'application/xml', Depth: '0' },
		),
	);
	const props = readProps(response);
	const metadata = Object.fromEntries(
		Object.entries(OUTPUT_PROPS)
			.filter(([, prop]) => typeof props[prop] === 'string')
			.map(([key, prop]) => [key, String(props[prop])]),
	);

	if (!metadata.fileId) {
		throw new NodeOperationError(
			this.getNode(),
			`Created the file "${path}", but could not read its file ID`,
			{ itemIndex: i },
		);
	}

	return { path, ...metadata, eTag: metadata.eTag?.replace(/^"|"$/g, '') };
}
