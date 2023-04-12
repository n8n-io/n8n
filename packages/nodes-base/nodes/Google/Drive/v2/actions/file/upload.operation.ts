import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { BINARY_ENCODING, jsonParse } from 'n8n-workflow';

import type { Readable } from 'stream';

import { UPLOAD_CHUNK_SIZE } from '../../helpers/interfaces';

import { updateDisplayOptions } from '../../../../../../utils/utilities';
import { googleApiRequest } from '../../transport';
import { prepareQueryString } from '../../helpers/utils';

const properties: INodeProperties[] = [
	{
		displayName: 'Binary Data',
		name: 'binaryData',
		type: 'boolean',
		default: false,
		description: 'Whether the data to upload should be taken from binary field',
	},
	{
		displayName: 'File Content',
		name: 'fileContent',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				binaryData: [false],
			},
		},
		placeholder: '',
		description: 'The text content of the file to upload',
	},
	{
		displayName: 'Binary Property',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		required: true,
		displayOptions: {
			show: {
				binaryData: [true],
			},
		},
		placeholder: '',
		description: 'Name of the binary property which contains the data for the file to be uploaded',
	},
	{
		displayName: 'File Name',
		name: 'name',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'invoice_1.pdf',
		description: 'The name the file should be saved as',
	},
	{
		displayName: 'Resolve Data',
		name: 'resolveData',
		type: 'boolean',
		default: false,
		// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
		description:
			'By default the response only contain the ID of the file. If this option gets activated, it will resolve the data automatically.',
	},
	{
		displayName: 'Parents',
		name: 'parents',
		type: 'string',
		typeOptions: {
			multipleValues: true,
		},
		default: [],
		description: 'The IDs of the parent folders which contain the file',
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

export async function execute(
	this: IExecuteFunctions,
	i: number,
	options: IDataObject,
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];

	const resolveData = this.getNodeParameter('resolveData', 0);

	let contentLength: number;
	let fileContent: Buffer | Readable;
	let originalFilename: string | undefined;
	let mimeType = 'text/plain';

	if (this.getNodeParameter('binaryData', i)) {
		const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i);
		const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
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
	} else {
		// Is text file
		fileContent = Buffer.from(this.getNodeParameter('fileContent', i) as string, 'utf8');
		contentLength = fileContent.byteLength;
	}

	const name = this.getNodeParameter('name', i) as string;
	const parents = this.getNodeParameter('parents', i) as string[];

	const queryFields = prepareQueryString(options.fields as string[]);

	let uploadId;
	if (Buffer.isBuffer(fileContent)) {
		const response = await googleApiRequest.call(
			this,
			'POST',
			'/upload/drive/v3/files',
			fileContent,
			{
				fields: queryFields,
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

	let response = await googleApiRequest.call(
		this,
		'PATCH',
		`/drive/v3/files/${uploadId}`,
		requestBody,
		{
			addParents: parents.join(','),
			// When set to true shared drives can be used.
			supportsAllDrives: true,
		},
	);

	if (resolveData) {
		response = await googleApiRequest.call(
			this,
			'GET',
			`/drive/v3/files/${response.id}`,
			{},
			{ fields: '*' },
		);
	}

	const executionData = this.helpers.constructExecutionMetaData(
		this.helpers.returnJsonArray(response as IDataObject[]),
		{ itemData: { item: i } },
	);
	returnData.push(...executionData);

	return returnData;
}
