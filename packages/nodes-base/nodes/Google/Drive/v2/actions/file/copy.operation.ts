import type { IExecuteFunctions } from 'n8n-core';
import type {
	IDataObject,
	INodeExecutionData,
	INodeParameterResourceLocator,
	INodeProperties,
} from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../../utils/utilities';
import { googleApiRequest } from '../../transport';
import { fileRLC, folderRLC } from '../common.descriptions';

const properties: INodeProperties[] = [
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

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const file = this.getNodeParameter('fileId', i) as INodeParameterResourceLocator;

	const fileId = file.value;

	let name = this.getNodeParameter('options.name', i, '') as string;
	if (name === '') {
		name = `Copy of ${file.cachedResultName}`;
	}

	const parents: string[] = [];
	const copyLocation = this.getNodeParameter('copyLocation', i) as string;
	if (copyLocation === 'select') {
		const destinationFolder = this.getNodeParameter('destinationFolderId', i, undefined, {
			extractValue: true,
		}) as string;
		parents.push(destinationFolder);
	}

	const body: IDataObject = { parents, name };

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

	return executionData;
}
