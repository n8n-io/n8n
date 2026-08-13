import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../utils/utilities';
import { pipedriveApiRequest, pipedriveApiRequestAllItemsOffset } from '../../transport';

const properties: INodeProperties[] = [
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
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		options: [
			{
				displayName: 'Archived Status',
				name: 'archived_status',
				type: 'options',
				default: 'all',
				options: [
					{
						name: 'All',
						value: 'all',
					},
					{
						name: 'Archived',
						value: 'archived',
					},
					{
						name: 'Not Archived',
						value: 'not_archived',
					},
				],
			},
			{
				displayName: 'Organization ID',
				name: 'organization_id',
				type: 'number',
				default: 0,
				description: 'Filter leads by organization ID',
			},
			{
				displayName: 'Owner Name or ID',
				name: 'owner_id',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getUserIds',
				},
				default: '',
				description:
					'Filter leads by owner. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Person ID',
				name: 'person_id',
				type: 'number',
				default: 0,
				description: 'Filter leads by person ID',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['lead'],
		operation: ['getAll'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		try {
			const returnAll = this.getNodeParameter('returnAll', i) as boolean;
			const qs: IDataObject = {};

			if (!returnAll) {
				qs.limit = this.getNodeParameter('limit', i) as number;
			}

			const filters = this.getNodeParameter('filters', i, {}) as IDataObject;

			if (Object.keys(filters).length) {
				Object.assign(qs, filters);
			}

			let responseData;
			if (returnAll) {
				responseData = await pipedriveApiRequestAllItemsOffset.call(this, 'GET', '/leads', {}, qs);
			} else {
				responseData = await pipedriveApiRequest.call(this, 'GET', '/leads', {}, qs, {
					apiVersion: 'v1',
				});
			}

			const data = Array.isArray(responseData.data) ? responseData.data : [responseData.data];

			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(data as IDataObject[]),
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
