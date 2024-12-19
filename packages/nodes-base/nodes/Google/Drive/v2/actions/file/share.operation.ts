import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { googleApiRequest } from '../../transport';
import { fileRLC, permissionsOptions, shareOptions } from '../common.descriptions';

const properties: INodeProperties[] = [
	{
		...fileRLC,
		description: 'The file to share',
	},
	permissionsOptions,
	shareOptions,
];

const displayOptions = {
	show: {
		resource: ['file'],
		operation: ['share'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];

	const fileId = this.getNodeParameter('fileId', i, undefined, {
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
		`/drive/v3/files/${fileId}/permissions`,
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
