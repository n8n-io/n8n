import { isRecord } from '@n8n/utils/is-record';
import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { NodeApiError, NodeOperationError, requestPath, sanitizeXmlName } from 'n8n-workflow';
import { parseStringPromise } from 'xml2js';

import { updateDisplayOptions } from '@utils/utilities';

import { nextCloudApiRequest, webDavPath } from '../../GenericFunctions';

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

async function readProps(xml: unknown): Promise<Record<string, unknown>> {
	const data: unknown =
		typeof xml === 'string'
			? await parseStringPromise(xml, {
					explicitArray: false,
					tagNameProcessors: [sanitizeXmlName],
					attrNameProcessors: [sanitizeXmlName],
				})
			: undefined;
	const multistatus = isRecord(data) ? data['d:multistatus'] : undefined;
	const response = isRecord(multistatus) ? [multistatus['d:response']].flat()[0] : undefined;
	const propstat = isRecord(response) ? [response['d:propstat']].flat()[0] : undefined;
	const prop = isRecord(propstat) ? propstat['d:prop'] : undefined;
	return isRecord(prop) ? prop : {};
}

export async function execute(this: IExecuteFunctions, i: number): Promise<IDataObject> {
	const content = this.getNodeParameter('content', i, '') as string;
	const fileName = this.getNodeParameter('fileName', i) as string;
	const parentFolder = (this.getNodeParameter('parentFolder', i, '/') as string).replace(
		/\/+$/,
		'',
	);
	const ifFileExists = this.getNodeParameter('ifFileExists', i) as 'fail' | 'overwrite';

	if (fileName.includes('/')) {
		throw new NodeOperationError(this.getNode(), 'The file name cannot contain "/"', {
			itemIndex: i,
			description: 'Put the folder path in "Parent Folder".',
		});
	}

	const path = `${parentFolder}/${fileName}`;
	const endpoint = requestPath`${webDavPath(parentFolder)}/${fileName}`;

	try {
		await nextCloudApiRequest.call(
			this,
			'PUT',
			endpoint,
			content,
			// Nextcloud answers 412 to this header when the file already exists
			ifFileExists === 'fail' ? { 'If-None-Match': '*' } : {},
		);
	} catch (error) {
		if (error instanceof NodeApiError && error.httpCode === '412') {
			throw new NodeOperationError(this.getNode(), `The file "${path}" already exists`, {
				itemIndex: i,
				description: 'Set "If File Exists" to "Overwrite" to replace it.',
			});
		}
		throw error;
	}

	// A PUT response has no body, so read the new file's metadata separately
	const props = await readProps(
		await nextCloudApiRequest.call(this, 'PROPFIND', endpoint, PROPFIND_BODY, {
			'Content-Type': 'application/xml',
			Depth: '0',
		}),
	);
	const text = (name: string) => {
		const value = props[name];
		return typeof value === 'string' ? value : undefined;
	};

	const fileId = text('oc:fileid');
	if (!fileId) {
		throw new NodeOperationError(
			this.getNode(),
			`Created the file "${path}", but could not read its file ID`,
			{ itemIndex: i },
		);
	}

	return {
		fileId,
		path,
		eTag: text('d:getetag')?.replace(/^"|"$/g, ''),
		lastModified: text('d:getlastmodified'),
		contentLength: text('d:getcontentlength'),
		contentType: text('d:getcontenttype'),
	};
}
