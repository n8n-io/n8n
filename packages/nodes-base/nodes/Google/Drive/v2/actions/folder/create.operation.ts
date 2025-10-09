import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { DRIVE } from '../../helpers/interfaces';
import { setParentFolder } from '../../helpers/utils';
import { googleApiRequest } from '../../transport';
import { driveRLC, folderRLC } from '../common.descriptions';

const properties: INodeProperties[] = [
	{
		displayName: 'Folder Name',
		name: 'name',
		type: 'string',
		default: '',
		placeholder: 'e.g. New Folder',
		description: "The name of the new folder. If not set, 'Untitled' will be used.",
	},
	{
		...driveRLC,
		displayName: 'Parent Drive',
		description: 'The drive where to create the new folder',
	},
	{
		...folderRLC,
		displayName: 'Parent Folder',
		description: 'The parent folder where to create the new folder',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		options: [
			{
				displayName: 'Simplify Output',
				name: 'simplifyOutput',
				type: 'boolean',
				default: true,
				description: 'Whether to return a simplified version of the response instead of all fields',
			},
			{
				displayName: 'Folder Color',
				name: 'folderColorRgb',
				type: 'color',
				default: '',
				description:
					'The color of the folder as an RGB hex string. If an unsupported color is specified, the closest color in the palette will be used instead.',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['folder'],
		operation: ['create'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const name = (this.getNodeParameter('name', i) as string) || 'Untitled';

	const driveId = this.getNodeParameter('driveId', i, undefined, {
		extractValue: true,
	}) as string;

	const folderId = this.getNodeParameter('folderId', i, undefined, {
		extractValue: true,
	}) as string;

	const body: IDataObject = {
		name,
		mimeType: DRIVE.FOLDER,
		parents: [setParentFolder(folderId, driveId)],
	};

	const folderColorRgb =
		(this.getNodeParameter('options.folderColorRgb', i, '') as string) || undefined;
	if (folderColorRgb) {
		body.folderColorRgb = folderColorRgb;
	}

	const simplifyOutput = this.getNodeParameter('options.simplifyOutput', i, true) as boolean;
	let fields;
	if (!simplifyOutput) {
		fields = '*';
	}

	const qs = {
		fields,
		includeItemsFromAllDrives: true,
		supportsAllDrives: true,
		spaces: 'appDataFolder, drive',
		corpora: 'allDrives',
	};

	const response = await googleApiRequest.call(this, 'POST', '/drive/v3/files', body, qs);

	const executionData = this.helpers.constructExecutionMetaData(
		this.helpers.returnJsonArray(response as IDataObject[]),
		{ itemData: { item: i } },
	);

	return executionData;
}
