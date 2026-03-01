import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeParameterResourceLocator,
	INodeProperties,
} from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { setParentFolder } from '../../helpers/utils';
import { googleApiRequest } from '../../transport';
import { driveRLC, fileRLC, folderRLC } from '../common.descriptions';

const properties: INodeProperties[] = [
	{
		...fileRLC,
		description: 'The file to copy',
	},
	{
		displayName: 'File Name',
		name: 'name',
		type: 'string',
		default: '',
		placeholder: 'e.g. My File',
		description:
			'The name of the new file. If not set, “Copy of {original file name}” will be used.',
	},
	{
		displayName: 'Copy In The Same Folder',
		name: 'sameFolder',
		type: 'boolean',
		default: true,
		description: 'Whether to copy the file in the same folder as the original file',
	},
	{
		...driveRLC,
		displayName: 'Parent Drive',
		description: 'The drive where to save the copied file',
		displayOptions: { show: { sameFolder: [false] } },
	},
	{
		...folderRLC,
		displayName: 'Parent Folder',
		description: 'The folder where to save the copied file',
		displayOptions: { show: { sameFolder: [false] } },
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		options: [
			{
				displayName: 'Copy Requires Writer Permission',
				name: 'copyRequiresWriterPermission',
				type: 'boolean',
				default: false,
				description:
					'Whether the options to copy, print, or download this file, should be disabled for readers and commenters',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'A short description of the file',
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

	const options = this.getNodeParameter('options', i, {});

	let name = this.getNodeParameter('name', i) as string;
	name = name ? name : `Copy of ${file.cachedResultName}`;

	const copyRequiresWriterPermission = options.copyRequiresWriterPermission || false;

	const qs = {
		includeItemsFromAllDrives: true,
		supportsAllDrives: true,
		spaces: 'appDataFolder, drive',
		corpora: 'allDrives',
	};

	const parents: string[] = [];
	const sameFolder = this.getNodeParameter('sameFolder', i) as boolean;

	if (!sameFolder) {
		const driveId = this.getNodeParameter('driveId', i, undefined, {
			extractValue: true,
		}) as string;

		const folderId = this.getNodeParameter('folderId', i, undefined, {
			extractValue: true,
		}) as string;

		parents.push(setParentFolder(folderId, driveId));
	}

	const body: IDataObject = { copyRequiresWriterPermission, parents, name };

	if (options.description) {
		body.description = options.description;
	}

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
