import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { BINARY_ENCODING, jsonParse } from 'n8n-workflow';

import type { Readable } from 'stream';

import { UPLOAD_CHUNK_SIZE } from '../../helpers/interfaces';

import { updateDisplayOptions } from '../../../../../../utils/utilities';
import { googleApiRequest } from '../../transport';
import { folderRLC } from '../common.descriptions';

const properties: INodeProperties[] = [
	{
		displayName: 'Input Data Field Name',
		name: 'inputDataFieldName',
		type: 'string',
		placeholder: '“e.g. data',
		default: 'data',
		required: true,
		hint: 'The name of the input field containing the binary file data to update the file',
		description:
			'Find the name of input field containing the binary data to update the file in the Input panel on the left, in the Binary tab',
	},
	{
		displayName: 'File Name',
		name: 'name',
		type: 'string',
		default: '',
		placeholder: 'e.g. My New File',
		description: 'If not specified, the file name will be used',
	},
	{
		...folderRLC,
		displayName: 'Parent Folder',
		name: 'parentFolder',
		description: 'The Folder you want to upload the file in. By default, the root folder is used.',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'APP Properties',
				name: 'appPropertiesUi',
				placeholder: 'Add Property',
				type: 'fixedCollection',
				default: {},
				typeOptions: {
					multipleValues: true,
				},
				description:
					'A collection of arbitrary key-value pairs which are private to the requesting app',
				options: [
					{
						name: 'appPropertyValues',
						displayName: 'APP Property',
						values: [
							{
								displayName: 'Key',
								name: 'key',
								type: 'string',
								default: '',
								description: 'Name of the key to add',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Value to set for the key',
							},
						],
					},
				],
			},
			{
				displayName: 'Properties',
				name: 'propertiesUi',
				placeholder: 'Add Property',
				type: 'fixedCollection',
				default: {},
				typeOptions: {
					multipleValues: true,
				},
				description: 'A collection of arbitrary key-value pairs which are visible to all apps',
				options: [
					{
						name: 'propertyValues',
						displayName: 'Property',
						values: [
							{
								displayName: 'Key',
								name: 'key',
								type: 'string',
								default: '',
								description: 'Name of the key to add',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Value to set for the key',
							},
						],
					},
				],
			},
			{
				displayName: 'Simplify Output',
				name: 'simplifyOutput',
				type: 'boolean',
				default: true,
				description:
					'Whether to return a simplified version of the response instead of the all fields',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['file'],
		operation: ['upload'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];

	let contentLength: number;
	let fileContent: Buffer | Readable;
	let originalFilename: string | undefined;
	let mimeType;

	const inputDataFieldName = this.getNodeParameter('inputDataFieldName', i) as string;

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

	const name = (this.getNodeParameter('name', i) as string) || originalFilename;
	const parentFolder = this.getNodeParameter('parentFolder', i, undefined, { extractValue: true });

	let uploadId;
	if (Buffer.isBuffer(fileContent)) {
		const response = await googleApiRequest.call(
			this,
			'POST',
			'/upload/drive/v3/files',
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
				encoding: null,
				json: false,
			},
		);
		uploadId = jsonParse<IDataObject>(response as string).id;
	} else {
		const resumableUpload = await googleApiRequest.call(
			this,
			'POST',
			'/upload/drive/v3/files',
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
				const response = await this.helpers.httpRequest({
					method: 'PUT',
					url: uploadUrl,
					headers: {
						'Content-Length': chunk.length,
						'Content-Range': `bytes ${offset}-${nextOffset - 1}/${contentLength}`,
					},
					body: chunk,
				});
				uploadId = response.id;
			} catch (error) {
				if (error.response?.status !== 308) throw error;
			}
			offset = nextOffset;
		}
	}

	const requestBody = {
		mimeType,
		name,
		originalFilename,
	};

	const propertiesUi = this.getNodeParameter(
		'options.propertiesUi.propertyValues',
		i,
		[],
	) as IDataObject[];

	if (propertiesUi.length) {
		Object.assign(requestBody, {
			properties: propertiesUi.reduce(
				(obj, value) => Object.assign(obj, { [`${value.key}`]: value.value }),
				{},
			),
		});
	}

	const appProperties = this.getNodeParameter(
		'options.appPropertiesUi.appPropertyValues',
		i,
		[],
	) as IDataObject[];

	if (propertiesUi.length) {
		Object.assign(requestBody, {
			appProperties: appProperties.reduce(
				(obj, value) => Object.assign(obj, { [`${value.key}`]: value.value }),
				{},
			),
		});
	}

	const simplifyOutput = this.getNodeParameter('options.simplifyOutput', i, true) as boolean;
	let fields;
	if (!simplifyOutput) {
		fields = '*';
	}

	const response = await googleApiRequest.call(
		this,
		'PATCH',
		`/drive/v3/files/${uploadId}`,
		requestBody,
		{
			addParents: parentFolder,
			supportsAllDrives: true,
			fields,
		},
	);

	const executionData = this.helpers.constructExecutionMetaData(
		this.helpers.returnJsonArray(response as IDataObject[]),
		{ itemData: { item: i } },
	);
	returnData.push(...executionData);

	return returnData;
}
