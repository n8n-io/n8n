import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { DRIVE } from '../../helpers/interfaces';
import { setFileProperties, setParentFolder, setUpdateCommonParams } from '../../helpers/utils';
import { googleApiRequest } from '../../transport';
import { driveRLC, folderRLC, updateCommonOptions } from '../common.descriptions';

import FormData from 'form-data';

const properties: INodeProperties[] = [
	{
		displayName: 'File Content',
		name: 'content',
		type: 'string',
		default: '',
		typeOptions: {
			rows: 2,
		},
		description: 'The text to create the file with',
	},
	{
		displayName: 'File Name',
		name: 'name',
		type: 'string',
		default: '',
		placeholder: 'e.g. My New File',
		description:
			"The name of the file you want to create. If not specified, 'Untitled' will be used.",
	},
	{
		...driveRLC,
		displayName: 'Parent Drive',
		required: false,
		description: 'The drive where to create the new file',
	},
	{
		...folderRLC,
		displayName: 'Parent Folder',
		required: false,
		description: 'The folder where to create the new file',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		options: [
			...updateCommonOptions,
			{
				displayName: 'Convert to Google Document',
				name: 'convertToGoogleDocument',
				type: 'boolean',
				default: false,
				description: 'Whether to create a Google Document (instead of the .txt default format)',
				hint: 'Google Docs API has to be enabled in the <a href="https://console.developers.google.com/apis/library/docs.googleapis.com" target="_blank">Google API Console</a>.',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['file'],
		operation: ['createFromText'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const name = (this.getNodeParameter('name', i) as string) || 'Untitled';

	const options = this.getNodeParameter('options', i, {});
	const convertToGoogleDocument = (options.convertToGoogleDocument as boolean) || false;
	const mimeType = convertToGoogleDocument ? DRIVE.DOCUMENT : 'text/plain';

	const driveId = this.getNodeParameter('driveId', i, undefined, {
		extractValue: true,
	}) as string;

	const folderId = this.getNodeParameter('folderId', i, undefined, {
		extractValue: true,
	}) as string;

	const metadata = {
		name,
		parents: [setParentFolder(folderId, driveId)],
		mimeType,
	};

	const bodyParameters = setFileProperties(metadata, options);

	const qs = setUpdateCommonParams(
		{
			includeItemsFromAllDrives: true,
			supportsAllDrives: true,
			spaces: 'appDataFolder, drive',
			corpora: 'allDrives',
		},
		options,
	);

	let response;
	if (convertToGoogleDocument) {
		const document = await googleApiRequest.call(
			this,
			'POST',
			'/drive/v3/files',
			bodyParameters,
			qs,
		);

		const text = this.getNodeParameter('content', i, '') as string;

		const body = {
			requests: [
				{
					insertText: {
						text,
						endOfSegmentLocation: {
							segmentId: '', //empty segment ID signifies the document's body
						},
					},
				},
			],
		};

		const updateResponse = await googleApiRequest.call(
			this,
			'POST',
			'',
			body,
			undefined,
			`https://docs.googleapis.com/v1/documents/${document.id}:batchUpdate`,
		);

		response = { id: updateResponse.documentId };
	} else {
		const content = Buffer.from(this.getNodeParameter('content', i, '') as string, 'utf8');
		const contentLength = content.byteLength;

		const multiPartBody = new FormData();
		multiPartBody.append('metadata', JSON.stringify(metadata), {
			contentType: 'application/json',
		});
		multiPartBody.append('data', content, {
			contentType: mimeType,
			knownLength: contentLength,
		});

		const uploadData = await googleApiRequest.call(
			this,
			'POST',
			'/upload/drive/v3/files',
			multiPartBody.getBuffer(),
			{
				uploadType: 'multipart',
				supportsAllDrives: true,
			},
			undefined,
			{
				headers: {
					'Content-Type': `multipart/related; boundary=${multiPartBody.getBoundary()}`,
					'Content-Length': multiPartBody.getLengthSync(),
				},
			},
		);

		const uploadId = uploadData.id;

		qs.addParents = setParentFolder(folderId, driveId);
		delete bodyParameters.parents;

		const responseData = await googleApiRequest.call(
			this,
			'PATCH',
			`/drive/v3/files/${uploadId}`,
			bodyParameters,
			qs,
		);

		response = { id: responseData.id };
	}

	const executionData = this.helpers.constructExecutionMetaData(
		this.helpers.returnJsonArray(response as IDataObject),
		{ itemData: { item: i } },
	);

	return executionData;
}
