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
				displayName: 'Predefined Filter Name or ID',
				name: 'filter_id',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getFilters',
				},
				default: '',
				description:
					'Predefined filter to apply to the deals to retrieve. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Stage Name or ID',
				name: 'stage_id',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getStageIds',
				},
				default: '',
				description:
					'ID of the stage to filter deals by. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{
						name: 'All Not Deleted',
						value: 'all_not_deleted',
					},
					{
						name: 'Deleted',
						value: 'deleted',
					},
					{
						name: 'Lost',
						value: 'lost',
					},
					{
						name: 'Open',
						value: 'open',
					},
					{
						name: 'Won',
						value: 'won',
					},
				],
				default: 'all_not_deleted',
				description: 'Status to filter deals by. Defaults to <code>all_not_deleted</code>',
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
					'ID of the user to filter deals by. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['deal'],
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
		customProperties = await pipedriveGetCustomProperties.call(this, 'deal');
	}

	for (let i = 0; i < items.length; i++) {
		try {
			const returnAll = this.getNodeParameter('returnAll', i) as boolean;
			const qs: IDataObject = {};

			if (!returnAll) {
				qs.limit = this.getNodeParameter('limit', i) as number;
			}

			const filters = this.getNodeParameter('filters', i, {}) as IDataObject;

			if (filters.filter_id) {
				qs.filter_id = filters.filter_id;
			}

			if (filters.stage_id) {
				qs.stage_id = filters.stage_id;
			}

			if (filters.status) {
				qs.status = filters.status;
			}

			if (filters.user_id) {
				qs.user_id = filters.user_id;
			}

			let responseData;
			if (returnAll) {
				responseData = await pipedriveApiRequestAllItemsCursor.call(this, 'GET', '/deals', {}, qs);
			} else {
				responseData = await pipedriveApiRequest.call(this, 'GET', '/deals', {}, qs);
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
