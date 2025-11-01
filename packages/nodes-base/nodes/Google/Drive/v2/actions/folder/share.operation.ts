import type {
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { googleApiRequest } from '../../transport';
import { folderNoRootRLC, permissionsOptions, shareOptions } from '../common.descriptions';

const properties: INodeProperties[] = [
	{
		...folderNoRootRLC,
		description: 'The folder to share',
	},
	permissionsOptions,
	shareOptions,
];

const displayOptions = {
	show: {
		resource: ['folder'],
		operation: ['share'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];

	const folderId = this.getNodeParameter('folderNoRootId', i, undefined, {
		extractValue: true,
	}) as string;

	const permissions = this.getNodeParameter('permissionsUi', i) as IDataObject;

	const shareOption = this.getNodeParameter('options', i);

	const body: IDataObject = {};

	const qs: IDataObject = {
		supportsAllDrives: true,
	};

	if (permissions.permissionsValues) {
		Object.assign(body, permissions.permissionsValues);
	}

	Object.assign(qs, shareOption);

	const response = await googleApiRequest.call(
		this,
		'POST',
		`/drive/v3/files/${folderId}/permissions`,
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
