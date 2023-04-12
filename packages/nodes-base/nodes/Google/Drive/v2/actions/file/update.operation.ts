import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../../utils/utilities';
import { prepareQueryString } from '../../helpers/utils';
import { googleApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'File Name',
				name: 'fileName',
				type: 'string',
				default: '',
				description: 'The name of the file',
			},
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
				displayName: 'Parent ID',
				name: 'parentId',
				type: 'string',
				default: '',
				description: 'The ID of the parent to set',
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
				displayName: 'Fields',
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
	const returnData: INodeExecutionData[] = [];

	const id = this.getNodeParameter('fileId', i, undefined, {
		extractValue: true,
	}) as string;
	const updateFields = this.getNodeParameter('updateFields', i, {});

	const qs: IDataObject = {
		supportsAllDrives: true,
	};

	Object.assign(qs, options);

	const queryFields = prepareQueryString(options.fields as string[]);

	qs.fields = queryFields;

	const body: IDataObject = {};

	if (updateFields.fileName) {
		body.name = updateFields.fileName;
	}

	if (updateFields.hasOwnProperty('trashed')) {
		body.trashed = updateFields.trashed;
	}

	if (updateFields.parentId && updateFields.parentId !== '') {
		qs.addParents = updateFields.parentId;
	}

	const responseData = await googleApiRequest.call(
		this,
		'PATCH',
		`/drive/v3/files/${id}`,
		body,
		qs,
	);

	const executionData = this.helpers.constructExecutionMetaData(
		this.helpers.returnJsonArray(responseData as IDataObject[]),
		{ itemData: { item: i } },
	);
	returnData.push(...executionData);

	return returnData;
}
