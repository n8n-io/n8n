import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../../utils/utilities';
import { prepareQueryString } from '../../helpers/utils';
import { googleApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName: 'Folder',
		name: 'name',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'invoices',
		description: 'The name of folder to create',
	},
];

const displayOptions = {
	show: {
		resource: ['folder'],
		operation: ['create'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	i: number,
	options: IDataObject,
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];

	const name = this.getNodeParameter('name', i) as string;

	const body = {
		name,
		mimeType: 'application/vnd.google-apps.folder',
		parents: options.parents || [],
	};

	const queryFields = prepareQueryString(options.fields as string[]);

	const qs = {
		fields: queryFields,
		supportsAllDrives: true,
	};

	const response = await googleApiRequest.call(this, 'POST', '/drive/v3/files', body, qs);

	const executionData = this.helpers.constructExecutionMetaData(
		this.helpers.returnJsonArray(response as IDataObject[]),
		{ itemData: { item: i } },
	);
	returnData.push(...executionData);

	return returnData;
}
