import type { IExecuteFunctions } from 'n8n-core';
import {
	BINARY_ENCODING,
	IDataObject,
	INodeExecutionData,
	INodeProperties,
	NodeOperationError,
} from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../../utils/utilities';
import { prepareQueryString } from '../../helpers/utils';
import { googleApiRequest } from '../../transport';
import { fileRLC } from '../common.descriptions';

import { UPLOAD_CHUNK_SIZE } from '../../helpers/interfaces';

import type { Readable } from 'stream';

const properties: INodeProperties[] = [
	{
		...fileRLC,
		displayName: 'File to Update',
		description: 'The file to update',
	},
	{
		displayName: 'Change File Content',
		name: 'changeFileContent',
		type: 'boolean',
		default: false,
		description: 'Whether to send a new binary data to update the file',
	},
	{
		displayName: 'Input data field name',
		name: 'inputDataFieldName',
		type: 'string',
		placeholder: '“e.g. data',
		default: '',
		hint: 'The name of the input field containing the binary file data to update the file',
		description:
			'Find the name of input field containing the binary data to update the file in the Input panel on the left, in the Binary tab',
		displayOptions: {
			show: {
				changeFileContent: [true],
			},
		},
	},
	{
		displayName: 'New Updated File Name',
		name: 'newUpdatedFileName',
		type: 'string',
		default: '',
		placeholder: 'e.g. My New File',
		description: 'If not specified, the file name will not be changed',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Keep Revision Forever',
				name: 'keepRevisionForever',
				type: 'boolean',
				default: false,
				description:
					"Whether to set the 'keepForever' field in the new head revision. This is only applicable to files with binary content in Google Drive. Only 200 revisions for the file can be kept forever. If the limit is reached, try deleting pinned revisions.",
			},
			{
				displayName: 'Move to Trash',
				name: 'trashed',
				type: 'boolean',
				default: false,
				description: 'Whether to move a file to the trash. Only the owner may trash a file.',
			},
			{
				displayName: 'OCR Language',
				name: 'ocrLanguage',
				type: 'string',
				default: '',
				description: 'A language hint for OCR processing during image import (ISO 639-1 code)',
			},
			{
				displayName: 'Use Content As Indexable Text',
				name: 'useContentAsIndexableText',
				type: 'boolean',
				default: false,
				description: 'Whether to use the uploaded content as indexable text',
			},
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Return Fields',
				name: 'fields',
				type: 'multiOptions',
				options: [
					{
						name: '[All]',
						value: '*',
						description: 'All fields',
					},
					{
						name: 'explicitlyTrashed',
						value: 'explicitlyTrashed',
					},
					{
						name: 'exportLinks',
						value: 'exportLinks',
					},
					{
						name: 'hasThumbnail',
						value: 'hasThumbnail',
					},
					{
						name: 'iconLink',
						value: 'iconLink',
					},
					{
						name: 'ID',
						value: 'id',
					},
					{
						name: 'Kind',
						value: 'kind',
					},
					{
						name: 'mimeType',
						value: 'mimeType',
					},
					{
						name: 'Name',
						value: 'name',
					},
					{
						name: 'Permissions',
						value: 'permissions',
					},
					{
						name: 'Shared',
						value: 'shared',
					},
					{
						name: 'Spaces',
						value: 'spaces',
					},
					{
						name: 'Starred',
						value: 'starred',
					},
					{
						name: 'thumbnailLink',
						value: 'thumbnailLink',
					},
					{
						name: 'Trashed',
						value: 'trashed',
					},
					{
						name: 'Version',
						value: 'version',
					},
					{
						name: 'webViewLink',
						value: 'webViewLink',
					},
				],
				default: [],
				description: 'The fields to return',
			},
		],
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
	options: IDataObject,
): Promise<INodeExecutionData[]> {
	const fileId = this.getNodeParameter('fileId', i, undefined, {
		extractValue: true,
	}) as string;

	const changeFileContent = this.getNodeParameter('changeFileContent', i, false) as boolean;

	let mimeType;

	// update file binary data
	if (changeFileContent) {
		let contentLength: number;
		let fileContent: Buffer | Readable;
		let originalFilename: string | undefined;

		const inputDataFieldName = this.getNodeParameter('inputDataFieldName', i) as string;

		if (!inputDataFieldName) {
			throw new NodeOperationError(
				this.getNode(),
				'The name of the input field containing the binary file data must be set',
				{
					itemIndex: i,
				},
			);
		}
		const binaryData = this.helpers.assertBinaryData(i, inputDataFieldName);

		if (binaryData.id) {
			// Stream data in 256KB chunks, and upload the via the resumable upload api
			fileContent = this.helpers.getBinaryStream(binaryData.id, UPLOAD_CHUNK_SIZE);
			const metadata = await this.helpers.getBinaryMetadata(binaryData.id);
			contentLength = metadata.fileSize;
			originalFilename = metadata.fileName;
			if (metadata.mimeType) mimeType = binaryData.mimeType;
		} else {
			fileContent = Buffer.from(binaryData.data, BINARY_ENCODING);
			contentLength = fileContent.length;
			originalFilename = binaryData.fileName;
			mimeType = binaryData.mimeType;
		}

		if (Buffer.isBuffer(fileContent)) {
			await googleApiRequest.call(
				this,
				'PATCH',
				`/upload/drive/v3/files/${fileId}`,
				fileContent,
				{
					uploadType: 'media',
				},
				undefined,
				{
					headers: {
						'Content-Type': mimeType,
						'Content-Length': contentLength,
					},
				},
			);
		} else {
			const resumableUpload = await googleApiRequest.call(
				this,
				'PATCH',
				`/upload/drive/v3/files/${fileId}`,
				undefined,
				{ uploadType: 'resumable' },
				undefined,
				{
					resolveWithFullResponse: true,
				},
			);
			const uploadUrl = resumableUpload.headers.location;

			let offset = 0;
			for await (const chunk of fileContent) {
				const nextOffset = offset + Number(chunk.length);
				try {
					await this.helpers.httpRequest({
						method: 'PUT',
						url: uploadUrl,
						headers: {
							'Content-Length': chunk.length,
							'Content-Range': `bytes ${offset}-${nextOffset - 1}/${contentLength}`,
						},
						body: chunk,
					});
				} catch (error) {
					if (error.response?.status !== 308) {
						throw new NodeOperationError(this.getNode(), error, { itemIndex: i });
					}
				}
				offset = nextOffset;
			}
		}
	}

	const updateFields = this.getNodeParameter('updateFields', i, {});

	const qs: IDataObject = {
		supportsAllDrives: true,
	};

	Object.assign(qs, options);

	const queryFields = prepareQueryString(options.fields as string[]);

	qs.fields = queryFields;

	const body: IDataObject = {};

	const newUpdatedFileName = this.getNodeParameter('newUpdatedFileName', i, '') as string;
	if (newUpdatedFileName) {
		body.name = newUpdatedFileName;
	}

	if (updateFields.hasOwnProperty('trashed')) {
		body.trashed = updateFields.trashed;
	}

	if (mimeType) {
		body.mimeType = mimeType;
	}

	// update file metadata
	const responseData = await googleApiRequest.call(
		this,
		'PATCH',
		`/drive/v3/files/${fileId}`,
		body,
		qs,
	);

	const executionData = this.helpers.constructExecutionMetaData(
		this.helpers.returnJsonArray(responseData as IDataObject[]),
		{ itemData: { item: i } },
	);

	return executionData;
}
