import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../utils/utilities';
import {
	pipedriveApiRequest,
	pipedriveApiRequestAllItemsCursor,
	pipedriveGetCustomProperties,
} from '../../transport';
import { resolveCustomFieldsV2 } from '../../helpers';
import { rawCustomFieldOutputOption } from '../common.description';

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
	rawCustomFieldOutputOption,
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		options: [
			{
				displayName: 'Deal ID',
				name: 'dealId',
				type: 'number',
				default: 0,
				description: 'If set, only return activities linked to this deal',
			},
			{
				displayName: 'Done',
				name: 'done',
				type: 'boolean',
				default: false,
				description:
					'Whether the Activity is done or not. If omitted returns both Done and Not done activities.',
			},
			{
				displayName: 'End Date',
				name: 'end_date',
				type: 'dateTime',
				default: '',
				description:
					'Use the Activity due date where you wish to stop fetching Activities from. Insert due date in YYYY-MM-DD format.',
			},
			{
				displayName: 'Predefined Filter Name or ID',
				name: 'filterId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getFilters',
				},
				default: '',
				description:
					'The ID of the Filter to use (will narrow down results if used together with user_id parameter). Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Start Date',
				name: 'start_date',
				type: 'dateTime',
				default: '',
				description:
					'Use the Activity due date where you wish to begin fetching Activities from. Insert due date in YYYY-MM-DD format.',
			},
			{
				displayName: 'Type Names or IDs',
				name: 'type',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getActivityTypes',
				},
				default: [],
				description:
					'Type of the Activity. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'User Name or ID',
				name: 'user_id',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getUserIds',
				},
				default: '',
				description:
					'The ID of the User whose Activities will be fetched. If omitted, the User associated with the API token will be used. If 0, Activities for all company Users will be fetched based on the permission sets. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['activity'],
		operation: ['getAll'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];

	const rawOutput = this.getNodeParameter('rawCustomFieldOutput', 0, false) as boolean;
	let customProperties;
	if (!rawOutput) {
		customProperties = await pipedriveGetCustomProperties.call(this, 'activity');
	}

	for (let i = 0; i < items.length; i++) {
		try {
			const returnAll = this.getNodeParameter('returnAll', i) as boolean;
			const qs: IDataObject = {};

			if (!returnAll) {
				qs.limit = this.getNodeParameter('limit', i) as number;
			}

			const filters = this.getNodeParameter('filters', i, {}) as IDataObject;

			if (filters.filterId) {
				qs.filter_id = filters.filterId;
			}

			if (filters.type && (filters.type as string[]).length > 0) {
				qs.type = (filters.type as string[]).join(',');
			}

			if (filters.user_id) {
				qs.user_id = filters.user_id;
			}

			if (filters.done !== undefined) {
				qs.done = filters.done === true ? 1 : 0;
			}

			if (filters.start_date) {
				qs.start_date = filters.start_date;
			}

			if (filters.end_date) {
				qs.end_date = filters.end_date;
			}

			if (filters.dealId) {
				qs.deal_id = filters.dealId;
			}

			let responseData;
			if (returnAll) {
				responseData = await pipedriveApiRequestAllItemsCursor.call(
					this,
					'GET',
					'/activities',
					{},
					qs,
				);
			} else {
				responseData = await pipedriveApiRequest.call(this, 'GET', '/activities', {}, qs);
			}

			const data = Array.isArray(responseData.data) ? responseData.data : [responseData.data];

			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(data as IDataObject[]),
				{ itemData: { item: i } },
			);

			if (customProperties) {
				for (const item of executionData) {
					resolveCustomFieldsV2(customProperties, item);
				}
			}

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
