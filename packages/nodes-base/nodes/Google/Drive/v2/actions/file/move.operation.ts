import type {
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { setParentFolder } from '../../helpers/utils';
import { googleApiRequest } from '../../transport';
import { driveRLC, fileRLC, folderRLC } from '../common.descriptions';

const properties: INodeProperties[] = [
	{
		...fileRLC,
		description: 'The file to move',
	},
	{
		...driveRLC,
		displayName: 'Parent Drive',
		description: 'The drive where to move the file',
	},
	{
		...folderRLC,
		displayName: 'Parent Folder',
		description: 'The folder where to move the file',
	},
];

const displayOptions = {
	show: {
		resource: ['file'],
		operation: ['move'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const fileId = this.getNodeParameter('fileId', i, undefined, {
		extractValue: true,
	});

	const driveId = this.getNodeParameter('driveId', i, undefined, {
		extractValue: true,
	}) as string;

	const folderId = this.getNodeParameter('folderId', i, undefined, {
		extractValue: true,
	}) as string;

	const qs = {
		includeItemsFromAllDrives: true,
		supportsAllDrives: true,
		spaces: 'appDataFolder, drive',
		corpora: 'allDrives',
	};

	const { parents } = await googleApiRequest.call(
		this,
		'GET',
		`/drive/v3/files/${fileId}`,
		undefined,
		{
			...qs,
			fields: 'parents',
		},
	);

	const response = await googleApiRequest.call(
		this,
		'PATCH',
		`/drive/v3/files/${fileId}`,
		undefined,
		{
			...qs,
			addParents: setParentFolder(folderId, driveId),
			removeParents: ((parents as string[]) || []).join(','),
		},
	);

	const executionData = this.helpers.constructExecutionMetaData(
		this.helpers.returnJsonArray(response as IDataObject[]),
		{ itemData: { item: i } },
	);

	return executionData;
}
