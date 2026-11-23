import { isRecord } from '@n8n/utils/is-record';
import type { IDataObject, IExecuteFunctions, INodeProperties, RequestPath } from 'n8n-workflow';
import {
	NodeApiError,
	NodeOperationError,
	decodePathValue,
	requestPath,
	sanitizeXmlName,
} from 'n8n-workflow';
import { posix } from 'path';
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
				name: 'Add Suffix',
				value: 'addSuffix',
				description:
					'Keep the existing file and save the new one with a number after the name, like "name (2).ext"',
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

const LIST_BODY = `<?xml version="1.0"?>
<d:propfind xmlns:d="DAV:">
  <d:prop><d:resourcetype/></d:prop>
</d:propfind>`;

async function readResponses(xml: string): Promise<Array<Record<string, unknown>>> {
	const data: unknown = await parseStringPromise(xml, {
		explicitArray: false,
		tagNameProcessors: [sanitizeXmlName],
		attrNameProcessors: [sanitizeXmlName],
	});
	const multistatus = isRecord(data) ? data['d:multistatus'] : undefined;
	return isRecord(multistatus) ? [multistatus['d:response']].flat().filter(isRecord) : [];
}

function readProps(response: Record<string, unknown> | undefined): Record<string, unknown> {
	const propstat = response ? [response['d:propstat']].flat()[0] : undefined;
	const prop = isRecord(propstat) ? propstat['d:prop'] : undefined;
	return isRecord(prop) ? prop : {};
}

// Another writer can take the chosen name between the folder listing and the PUT
const MAX_TRIES = 5;

// Like Nextcloud's own "keep both" names: "notes (2).txt", and ".env (2)" for a leading dot
function splitName(fileName: string) {
	const dot = fileName.lastIndexOf('.');
	return dot > 0
		? { stem: fileName.slice(0, dot), ext: fileName.slice(dot) }
		: { stem: fileName, ext: '' };
}

export function nameWithSuffix(fileName: string, suffix: number) {
	const { stem, ext } = splitName(fileName);
	return `${stem} (${suffix})${ext}`;
}

export function nextSuffix(fileName: string, names: string[]) {
	const { stem, ext } = splitName(fileName);
	const start = `${stem} (`;
	const end = `)${ext}`;
	const numbers = names
		.filter((name) => name.startsWith(start) && name.endsWith(end))
		.map((name) => name.slice(start.length, name.length - end.length))
		.filter((suffix) => /^\d+$/.test(suffix))
		.map(Number);
	return Math.max(1, ...numbers) + 1;
}

async function listNames(this: IExecuteFunctions, folder: RequestPath) {
	const responses = await readResponses(
		await nextCloudApiRequest.call(this, 'PROPFIND', folder, LIST_BODY, {
			'Content-Type': 'application/xml',
			Depth: '1',
		}),
	);
	// The first response is the listed folder itself. Subfolders stay in, because their names are taken too.
	return responses
		.slice(1)
		.map((response) => response['d:href'])
		.filter((href) => typeof href === 'string')
		.map((href) => decodePathValue(posix.basename(href)));
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

async function putWithSuffix(
	this: IExecuteFunctions,
	folder: RequestPath,
	fileName: string,
	content: string,
) {
	const first = nextSuffix(fileName, await listNames.call(this, folder));
	for (let suffix = first; suffix < first + MAX_TRIES; suffix++) {
		const name = nameWithSuffix(fileName, suffix);
		if (await putIfNew.call(this, requestPath`${folder}/${name}`, content)) return name;
	}
	return undefined;
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

		const suffixedName = await putWithSuffix.call(this, folder, fileName, content);
		if (suffixedName === undefined) {
			throw new NodeOperationError(
				this.getNode(),
				`Could not find a free name for "${parentFolder}/${fileName}"`,
				{
					itemIndex: i,
					description: 'Other files with the same name were created at the same time.',
				},
			);
		}
		writtenName = suffixedName;
	}

	const path = `${parentFolder}/${writtenName}`;

	// A PUT response has no body, so read the new file's metadata separately
	const [response] = await readResponses(
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
