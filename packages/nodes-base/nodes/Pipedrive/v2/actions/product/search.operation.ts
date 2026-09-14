import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../utils/utilities';
import { pipedriveApiRequest, pipedriveApiRequestAllItemsOffset } from '../../transport';
import { parseSearchResponse } from '../../helpers';

const properties: INodeProperties[] = [
	{
		displayName: 'Term',
		name: 'term',
		type: 'string',
		required: true,
		default: '',
		description: 'The search term to look for. Minimum 2 characters (or 1 if using exact_match).',
	},
	{
		displayName: 'Exact Match',
		name: 'exactMatch',
		type: 'boolean',
		default: false,
		description:
			'Whether only full exact matches against the given term are returned. It is not case sensitive.',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 500,
		},
		default: 100,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		options: [
			{
				displayName: 'Include Fields',
				name: 'includeFields',
				type: 'string',
				default: '',
				description:
					'Supports including optional fields in the results which are not provided by default',
			},
			{
				displayName: 'Search Fields',
				name: 'fields',
				type: 'multiOptions',
				options: [
					{
						name: 'Code',
						value: 'code',
					},
					{
						name: 'Custom Fields',
						value: 'custom_fields',
					},
					{
						name: 'Name',
						value: 'name',
					},
				],
				default: ['name', 'code', 'custom_fields'],
				description: 'Fields to perform the search from. Defaults to all of them.',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['product'],
		operation: ['search'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		try {
			const qs: IDataObject = {};

			qs.term = this.getNodeParameter('term', i) as string;
			qs.exact_match = this.getNodeParameter('exactMatch', i) as boolean;

			const returnAll = this.getNodeParameter('returnAll', i) as boolean;
			if (!returnAll) {
				qs.limit = this.getNodeParameter('limit', i) as number;
			}

			const additionalFields = this.getNodeParameter('additionalFields', i);

			if (additionalFields.fields) {
				qs.fields = (additionalFields.fields as string[]).join(',');
			}

			if (additionalFields.includeFields) {
				qs.include_fields = additionalFields.includeFields as string;
			}

			// Search uses v1 API
			let responseData;
			if (returnAll) {
				responseData = await pipedriveApiRequestAllItemsOffset.call(
					this,
					'GET',
					'/products/search',
					{},
					qs,
				);
			} else {
				responseData = await pipedriveApiRequest.call(this, 'GET', '/products/search', {}, qs, {
					apiVersion: 'v1',
				});
			}

			const data = parseSearchResponse(responseData);

			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(data),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
		} catch (error) {
			if (this.continueOnFail()) {
				returnData.push(
					...this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray({ error: (error as Error).message }),
						{ itemData: { item: i } },
					),
				);
				continue;
			}
			throw error;
		}
	}

	return returnData;
}
