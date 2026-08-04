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
				displayName: 'Deal ID',
				name: 'deal_id',
				type: 'number',
				default: 0,
				description: 'Filter notes by deal ID',
			},
			{
				displayName: 'End Date',
				name: 'end_date',
				type: 'dateTime',
				default: '',
				description: 'The end date for filtering notes in YYYY-MM-DD format',
			},
			{
				displayName: 'Lead ID',
				name: 'lead_id',
				type: 'string',
				default: '',
				description: 'Filter notes by lead ID',
			},
			{
				displayName: 'Organization Name or ID',
				name: 'org_id',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getOrganizationIds',
				},
				default: '',
				description:
					'Filter notes by organization. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Person ID',
				name: 'person_id',
				type: 'number',
				default: 0,
				description: 'Filter notes by person ID',
			},
			{
				displayName: 'Pinned to Deal',
				name: 'pinned_to_deal_flag',
				type: 'boolean',
				default: false,
				description: 'Whether to filter by notes pinned to a deal',
			},
			{
				displayName: 'Pinned to Organization',
				name: 'pinned_to_organization_flag',
				type: 'boolean',
				default: false,
				description: 'Whether to filter by notes pinned to an organization',
			},
			{
				displayName: 'Pinned to Person',
				name: 'pinned_to_person_flag',
				type: 'boolean',
				default: false,
				description: 'Whether to filter by notes pinned to a person',
			},
			{
				displayName: 'Sort',
				name: 'sort',
				type: 'options',
				options: [
					{
						name: 'ID',
						value: 'id',
					},
					{
						name: 'Update Time',
						value: 'update_time',
					},
					{
						name: 'Content',
						value: 'content',
					},
				],
				default: 'id',
				description: 'The field to sort by',
			},
			{
				displayName: 'Start Date',
				name: 'start_date',
				type: 'dateTime',
				default: '',
				description: 'The start date for filtering notes in YYYY-MM-DD format',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['note'],
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

			for (const key of Object.keys(filters)) {
				// Convert boolean pin flags to 0/1 for v1 API
				if (
					['pinned_to_deal_flag', 'pinned_to_person_flag', 'pinned_to_organization_flag'].includes(
						key,
					)
				) {
					qs[key] = filters[key] ? 1 : 0;
				} else {
					qs[key] = filters[key];
				}
			}

			let responseData;
			if (returnAll) {
				responseData = await pipedriveApiRequestAllItemsOffset.call(this, 'GET', '/notes', {}, qs);
			} else {
				responseData = await pipedriveApiRequest.call(this, 'GET', '/notes', {}, qs, {
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
