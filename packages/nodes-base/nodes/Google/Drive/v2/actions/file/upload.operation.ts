import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';
import { googleApiRequest } from '../../transport';
import { driveRLC, folderRLC, updateCommonOptions } from '../common.descriptions';
import {
	getItemBinaryData,
	setFileProperties,
	setUpdateCommonParams,
	setParentFolder,
} from '../../helpers/utils';

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
		description: 'If not specified, the original file name will be used',
	},
	{
		...driveRLC,
		displayName: 'Parent Drive',
		description: 'The drive where to upload the file',
	},
	{
		...folderRLC,
		displayName: 'Parent Folder',
		description: 'The folder where to upload the file',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			...updateCommonOptions,
			{
				displayName: 'Simplify Output',
				name: 'simplifyOutput',
				type: 'boolean',
				default: true,
				description: 'Whether to return a simplified version of the response instead of all fields',
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

	const inputDataFieldName = this.getNodeParameter('inputDataFieldName', i) as string;

	const { contentLength, fileContent, originalFilename, mimeType } = await getItemBinaryData.call(
		this,
		inputDataFieldName,
		i,
	);

	const name = (this.getNodeParameter('name', i) as string) || originalFilename;

	const driveId = this.getNodeParameter('driveId', i, undefined, {
		extractValue: true,
	}) as string;

	const folderId = this.getNodeParameter('folderId', i, undefined, {
		extractValue: true,
	}) as string;

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
			},
		);

		uploadId = response.id;
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
				uploadId = response?.id;
			} catch (error) {
				if (error.response?.status !== 308) throw error;
			}
			offset = nextOffset;
		}
	}

	const options = this.getNodeParameter('options', i, {});

	const qs = setUpdateCommonParams(
		{
			addParents: setParentFolder(folderId, driveId),
			includeItemsFromAllDrives: true,
			supportsAllDrives: true,
			spaces: 'appDataFolder, drive',
			corpora: 'allDrives',
		},
		options,
	);

	if (!options.simplifyOutput) {
		qs.fields = '*';
	}

	const body = setFileProperties(
		{
			mimeType,
			name,
			originalFilename,
		},
		options,
	);

	const response = await googleApiRequest.call(
		this,
		'PATCH',
		`/drive/v3/files/${uploadId}`,
		body,
		qs,
	);

	const executionData = this.helpers.constructExecutionMetaData(
		this.helpers.returnJsonArray(response as IDataObject[]),
		{ itemData: { item: i } },
	);
	returnData.push(...executionData);

	return returnData;
}
