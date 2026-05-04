import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { processJsonInput, updateDisplayOptions, wrapData } from '@utils/utilities';

import { gravityZoneApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName:
			'Documentation: <a href="https://www.bitdefender.com/business/support/en/77209-128494-getnetworkinventoryitems.html" target="_blank" rel="noopener noreferrer">Get Network Inventory Items</a>',
		name: 'getNetworkInventoryItemsDocsNotice',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Parent ID',
				name: 'parentId',
				type: 'string',
				default: '',
				description: 'The ID of the target company or group',
			},
			{
				displayName: 'Filters (JSON)',
				name: 'filters',
				type: 'json',
				default: '{}',
				description: 'A filters object',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
			},
			{
				displayName: 'Options (JSON)',
				name: 'queryOptions',
				type: 'json',
				default: '{}',
				description: 'An options object',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
			},
			{
				displayName: 'Page',
				name: 'page',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 1,
				description: 'Page number for pagination',
			},
			{
				displayName: 'Per Page',
				name: 'perPage',
				type: 'number',
				typeOptions: { minValue: 1, maxValue: 100 },
				default: 50,
				description: 'Number of items per page',
			},
		],
	},
];

const displayOptions = { show: { category: ['network'], action: ['getNetworkInventoryItems'] } };

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const options = this.getNodeParameter('options', i, {});

	const params: IDataObject = {};

	if (options.parentId !== undefined && (options.parentId as string) !== '')
		params.parentId = options.parentId;
	if (options.page !== undefined) params.page = options.page;
	if (options.perPage !== undefined) params.perPage = options.perPage;
	if (options.filters !== undefined) {
		const filters = processJsonInput(options.filters, 'Filters') as IDataObject;
		if (Object.keys(filters).length > 0) params.filters = filters;
	}
	if (options.queryOptions !== undefined) {
		const queryOptions = processJsonInput(options.queryOptions, 'Options') as IDataObject;
		if (Object.keys(queryOptions).length > 0) params.options = queryOptions;
	}

	const responseData = await gravityZoneApiRequest.call(
		this,
		'network',
		'getNetworkInventoryItems',
		params,
		'v1.1',
	);

	return this.helpers.constructExecutionMetaData(wrapData(responseData), { itemData: { item: i } });
}
