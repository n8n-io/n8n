import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { odooApiRequest } from '../../transport';
import { updateDisplayOptions } from '../../../../../utils/utilities';

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
		default: 50,
		displayOptions: { show: { returnAll: [false] } },
		typeOptions: { minValue: 1, maxValue: 1000 },
		description: 'Max number of results to return',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		default: {},
		placeholder: 'Add Filter',
		options: [
			{
				displayName: 'Linked Document Model',
				name: 'res_model',
				type: 'string',
				default: '',
				placeholder: 'e.g. res.partner',
				description: 'Filter activities linked to this model',
			},
			{
				displayName: 'Linked Document ID',
				name: 'res_id',
				type: 'number',
				default: 0,
				description: 'Filter activities linked to a specific record ID',
			},
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		default: {},
		placeholder: 'Add Option',
		options: [
			{
				displayName: 'Fields to Include',
				name: 'fieldsList',
				type: 'multiOptions',
				description:
					'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				default: [],
				typeOptions: { loadOptionsMethod: 'getActivityFields' },
			},
		],
	},
];

const displayOptions = {
	show: { resource: ['activity'], operation: ['getAll'] },
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		try {
			const returnAll = this.getNodeParameter('returnAll', i) as boolean;
			const filters = this.getNodeParameter('filters', i) as IDataObject;
			const options = this.getNodeParameter('options', i) as IDataObject;
			const fields = (options.fieldsList as string[]) || [];

			const domain: unknown[] = [];
			if (filters.res_model) domain.push(['res_model', '=', filters.res_model]);
			if (filters.res_id) domain.push(['res_id', '=', filters.res_id]);

			const body: IDataObject = { domain, fields, offset: 0 };
			if (!returnAll) body.limit = this.getNodeParameter('limit', i) as number;

			const response = (await odooApiRequest.call(
				this,
				'mail.activity',
				'search_read',
				body,
			)) as IDataObject[];

			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(response),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
		} catch (error) {
			if (this.continueOnFail()) {
				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray({ error: error.message }),
					{ itemData: { item: i } },
				);
				returnData.push(...executionData);
				continue;
			}
			throw error;
		}
	}

	return returnData;
}
