import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { folderFields, folderRLC } from '../../descriptions';
import { decodeOutlookId } from '../../helpers/utils';
import { microsoftApiRequest } from '../../transport';

export const properties: INodeProperties[] = [
	folderRLC,
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		options: [
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'multiOptions',
				description: 'The fields to add to the output',
				options: folderFields,
				default: [],
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['folder'],
		operation: ['get'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, index: number) {
	const qs: IDataObject = {};

	const folderId = decodeOutlookId(
		this.getNodeParameter('folderId', index, undefined, {
			extractValue: true,
		}) as string,
	);

	const options = this.getNodeParameter('options', index);

	if (options.fields) {
		qs.$select = (options.fields as string[]).join(',');
	}

	if (options.filter) {
		qs.$filter = options.filter;
	}
	const responseData = await microsoftApiRequest.call(
		this,
		'GET',
		`/mailFolders/${folderId}`,
		{},
		qs,
	);

	const executionData = this.helpers.constructExecutionMetaData(
		this.helpers.returnJsonArray(responseData as IDataObject),
		{ itemData: { item: index } },
	);

	return executionData;
}
