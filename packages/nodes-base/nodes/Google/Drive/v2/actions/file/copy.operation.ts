import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../../utils/utilities';
import { googleApiRequest } from '../../transport';
import { prepareQueryString } from '../../helpers/utils';
import { driveRLC, fileRLC, folderRLC } from '../common.descriptions';

const properties: INodeProperties[] = [
	driveRLC,
	fileRLC,
	{
		displayName: 'Copy Location',
		name: 'copyLocation',
		type: 'options',
		default: 'current',
		options: [
			{
				name: 'Copy In The Same Folder',
				value: 'current',
			},
			{
				name: 'Select Destination',
				value: 'select',
			},
		],
	},
	{
		...driveRLC,
		displayName: 'Destination Drive',
		name: 'destinationDriveId',
		description: 'The Drive where you want to save the copied file',
		displayOptions: { show: { copyLocation: ['select'] } },
	},
	{
		...folderRLC,
		displayName: 'Destination Folder',
		name: 'destinationFolderId',
		description: 'The folder where you want to save the copied file',
		displayOptions: { show: { copyLocation: ['select'] } },
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'File Name',
				name: 'name',
				type: 'string',
				default: '',
				placeholder: 'e.g. My File',
				description:
					'The name of the new file. If not set, “Copy of {original file name}” will be used.',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['file'],
		operation: ['copy'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	i: number,
	options: IDataObject,
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];

	const fileId = this.getNodeParameter('fileId', i, undefined, {
		extractValue: true,
	}) as string;

	const queryFields = prepareQueryString(options.fields as string[]);

	const body: IDataObject = {
		fields: queryFields,
	};

	const optionProperties = ['name', 'parents'];
	for (const propertyName of optionProperties) {
		if (options[propertyName] !== undefined) {
			body[propertyName] = options[propertyName];
		}
	}

	const qs = {
		supportsAllDrives: true,
	};

	const response = await googleApiRequest.call(
		this,
		'POST',
		`/drive/v3/files/${fileId}/copy`,
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
