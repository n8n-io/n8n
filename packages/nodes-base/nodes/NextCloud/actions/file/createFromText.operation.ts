import { ensureError } from '@n8n/utils/errors/ensure-error';
import type { IDataObject, IExecuteFunctions, INodeProperties, RequestPath } from 'n8n-workflow';
import { NodeApiError, NodeOperationError, requestPath } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import {
	ITEM_PROPFIND_BODY,
	nextCloudApiRequest,
	outputPath,
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
	const content = this.getNodeParameter('content', i, '', { ensureType: 'string' }) as string;
	const fileName = String(this.getNodeParameter('fileName', i) ?? '');
	const parentFolder = (
		this.getNodeParameter('parentFolder', i, '/', { ensureType: 'string' }) as string
	).replace(/\/+$/, '');
	const ifFileExists = this.getNodeParameter('ifFileExists', i) as
		| 'addSuffix'
		| 'fail'
		| 'overwrite';

	if (fileName.trim() === '') {
		throw new NodeOperationError(this.getNode(), 'The file name is empty', {
			itemIndex: i,
			description: 'Set "File Name" to the name of the new file, with its extension.',
		});
	}

	if (fileName.includes('/')) {
		throw new NodeOperationError(this.getNode(), 'The file name cannot contain "/"', {
			itemIndex: i,
			description: 'Put the folder path in "Parent Folder".',
		});
	}

	const folder = webDavPath(parentFolder);
	const endpoint = requestPath`${folder}/${fileName}`;
	let writtenName = fileName;

	try {
		if (ifFileExists === 'overwrite') {
			await nextCloudApiRequest.call(this, 'PUT', endpoint, content);
		} else if (!(await putIfNew.call(this, endpoint, content))) {
			if (ifFileExists === 'fail') {
				throw new NodeOperationError(
					this.getNode(),
					`The file "${outputPath(`${parentFolder}/${fileName}`)}" already exists`,
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
					`The file "${outputPath(`${parentFolder}/${writtenName}`)}" already exists`,
					{ itemIndex: i },
				);
			}
		}
	} catch (error) {
		// Nextcloud answers 409 when the parent folder is missing or is a file, or when a folder has the file's name
		if (error instanceof NodeApiError && error.httpCode === '409') {
			throw new NodeOperationError(
				this.getNode(),
				`The folder "${outputPath(parentFolder)}" does not exist`,
				{
					itemIndex: i,
					description:
						'Nextcloud gives this error when "Parent Folder" does not exist or is a file, or when a folder already has the name in "File Name".',
				},
			);
		}
		throw error;
	}

	const path = outputPath(`${parentFolder}/${writtenName}`);
	const readError = `Created the file "${path}", but could not read its file ID`;

	let metadata: Record<string, string>;
	try {
		// A PUT response has no body, so read the new file's metadata separately
		const [response] = await readMultistatus(
			await nextCloudApiRequest.call(
				this,
				'PROPFIND',
				requestPath`${folder}/${writtenName}`,
				ITEM_PROPFIND_BODY,
				{ 'Content-Type': 'application/xml', Depth: '0' },
			),
		);
		const props = readProps(response);
		metadata = Object.fromEntries(
			Object.entries(OUTPUT_PROPS)
				.filter(([, prop]) => typeof props[prop] === 'string')
				.map(([key, prop]) => [key, String(props[prop])]),
		);
	} catch (error) {
		throw new NodeOperationError(this.getNode(), readError, {
			itemIndex: i,
			description: ensureError(error).message,
		});
	}

	if (!metadata.fileId) {
		throw new NodeOperationError(this.getNode(), readError, { itemIndex: i });
	}

	return { path, ...metadata, eTag: metadata.eTag?.replace(/^"|"$/g, '') };
}
