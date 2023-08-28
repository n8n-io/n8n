import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { getSubfolders, microsoftApiRequest, microsoftApiRequestAllItems } from '../../transport';
import { updateDisplayOptions } from '@utils/utilities';
import { folderRLC, returnAllOrLimit } from '../../descriptions';

export const properties: INodeProperties[] = [
	folderRLC,
	...returnAllOrLimit,
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['folder'],
				operation: ['getChildren'],
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
				displayName: 'Filter Query',
				name: 'filter',
				type: 'string',
				default: '',
				hint: 'Search query to filter folders. <a href="https://docs.microsoft.com/en-us/graph/query-parameters#filter-parameter">More info</a>.',
			},
			{
				displayName: 'Include Child Folders',
				name: 'includeChildFolders',
				type: 'boolean',
				default: false,
				description: 'Whether to include child folders in the response',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['folder'],
		operation: ['getChildren'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	let responseData;
	const qs: IDataObject = {};

	const folderId = this.getNodeParameter('folderId', index, undefined, {
		extractValue: true,
	}) as string;
	const returnAll = this.getNodeParameter('returnAll', index);
	const options = this.getNodeParameter('options', index);

	if (options.fields) {
		qs.$select = options.fields;
	}

	if (options.filter) {
		qs.$filter = options.filter;
	}

	if (returnAll) {
		responseData = await microsoftApiRequestAllItems.call(
			this,
			'value',
			'GET',
			`/mailFolders/${folderId}/childFolders`,
			qs,
		);
	} else {
		qs.$top = this.getNodeParameter('limit', index);
		responseData = await microsoftApiRequest.call(
			this,
			'GET',
			`/mailFolders/${folderId}/childFolders`,
			undefined,
			qs,
		);
		responseData = responseData.value;
	}

	if (options.includeChildFolders) {
		responseData = await getSubfolders.call(this, responseData as IDataObject[]);
	}

	const executionData = this.helpers.constructExecutionMetaData(
		this.helpers.returnJsonArray(responseData as IDataObject[]),
		{ itemData: { item: index } },
	);

	return executionData;
}
