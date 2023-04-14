import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { jsonParse } from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../../utils/utilities';
import { driveRLC, folderRLC } from '../common.descriptions';
import { googleApiRequest } from '../../transport';

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
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Convert to Google Document',
				name: 'convertToGoogleDocument',
				type: 'boolean',
				default: false,
				description: 'Whether to create a Google Document (instead of the .txt default format)',
			},
			{
				...driveRLC,
				displayName: 'Drive',
				required: false,
				description:
					'he Drive where you want to create the file in. By default, “My Drive“ is used.',
			},
			{
				...folderRLC,
				displayName: 'Parent Folder',
				required: false,
				description:
					'The Folder where you want to create the file in. By default, the root folder is used.',
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
	const returnData: INodeExecutionData[] = [];

	const content = Buffer.from(this.getNodeParameter('content', i, '') as string, 'utf8');
	const contentLength = content.byteLength;

	const name = (this.getNodeParameter('name', i) as string) || 'Untitled';

	const options = this.getNodeParameter('options', i, {});

	const parentFolderId = (options.parentFolderId as string) || 'root';

	const uploadResponse = await googleApiRequest.call(
		this,
		'POST',
		'/upload/drive/v3/files',
		content,
		{
			fields: {},
			uploadType: 'media',
		},
		undefined,
		{
			headers: {
				'Content-Type': 'text/plain',
				'Content-Length': contentLength,
			},
			encoding: null,
			json: false,
		},
	);
	const uploadId = jsonParse<IDataObject>(uploadResponse as string).id;

	const response = await googleApiRequest.call(
		this,
		'PATCH',
		`/drive/v3/files/${uploadId}`,
		{ name },
		{
			addParents: [parentFolderId],
			supportsAllDrives: true,
		},
	);

	console.log(response);

	return returnData;
}
