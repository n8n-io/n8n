import {
	type IDataObject,
	type INodeExecutionData,
	type INodeProperties,
	type IExecuteFunctions,
	updateDisplayOptions,
} from 'n8n-workflow';

import { seaTableApiRequest } from '../../GenericFunctions';

const properties: INodeProperties[] = [
	{
		displayName: 'Asset Path',
		name: 'assetPath',
		type: 'string',
		placeholder: '/images/2023-09/logo.png',
		required: true,
		default: '',
	},
];

const displayOptions = {
	show: {
		resource: ['asset'],
		operation: ['getPublicURL'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const assetPath = this.getNodeParameter('assetPath', index) as string;

	let responseData = [] as IDataObject[];
	if (assetPath) {
		responseData = await seaTableApiRequest.call(
			this,
			{},
			'GET',
			`/api/v2.1/dtable/app-download-link/?path=${assetPath}`,
		);
	}

	return this.helpers.returnJsonArray(responseData);
}
