import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { microsoftApiRequest } from '../../transport';
import { updateDisplayOptions } from '@utils/utilities';
import { folderRLC } from '../../descriptions';

export const properties: INodeProperties[] = [
	folderRLC,
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['folder'],
				operation: ['get'],
			},
		},
		options: [
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'string',
				default: '',
				description: 'Fields the response will contain. Multiple can be added separated by ,.',
			},
			{
				displayName: 'Filter',
				name: 'filter',
				type: 'string',
				default: '',
				description:
					'Microsoft Graph API OData $filter query. Information about the syntax can be found <a href="https://docs.microsoft.com/en-us/graph/query-parameters#filter-parameter">here</a>.',
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

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const qs: IDataObject = {};

	const folderId = this.getNodeParameter('folderId', index, undefined, {
		extractValue: true,
	}) as string;
	const options = this.getNodeParameter('options', index);

	if (options.fields) {
		qs.$select = options.fields;
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
