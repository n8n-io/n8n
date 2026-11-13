import {
	type IDataObject,
	type INodeExecutionData,
	type INodeProperties,
	type IExecuteFunctions,
	updateDisplayOptions,
	requestPath,
	decodePathValue,
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
		const path = this.getNode().typeVersion < 2.1 ? decodePathValue(assetPath) : assetPath;
		responseData = await seaTableApiRequest.call(
			this,
			{},
			'GET',
			requestPath`/api/v2.1/dtable/app-download-link/`,
			{},
			{ path },
		);
	}

	return this.helpers.returnJsonArray(responseData);
}
