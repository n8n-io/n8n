import {
	type IDataObject,
	type INodeExecutionData,
	type INodeProperties,
	type IExecuteFunctions,
	updateDisplayOptions,
	requestPath,
} from 'n8n-workflow';

import { seaTableApiRequest } from '../../GenericFunctions';

export const properties: INodeProperties[] = [];

const displayOptions = {
	show: {
		resource: ['base'],
		operation: ['metadata'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[]> {
	const responseData = await seaTableApiRequest.call(
		this,
		{},
		'GET',
		(dtableUuid) => requestPath`/api-gateway/api/v2/dtables/${dtableUuid}/metadata/`,
	);
	return this.helpers.returnJsonArray(responseData.metadata as IDataObject[]);
}
