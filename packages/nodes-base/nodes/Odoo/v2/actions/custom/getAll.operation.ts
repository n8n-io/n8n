import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../utils/utilities';
import { buildDomain, type IOdooFilters } from '../../helpers/utils';
import { odooApiRequest } from '../../transport';

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
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		default: {},
		placeholder: 'Add Option',
		options: [
			{
				displayName: 'Fields to Include',
				name: 'fieldsList',
				type: 'string',
				requiresDataPath: 'multiple',
				default: '',
				description: 'Comma-separated list of field names to include in the response',
				placeholder: 'e.g. name,email,phone',
			},
		],
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'fixedCollection',
		default: {},
		placeholder: 'Add Filter',
		typeOptions: { multipleValues: true },
		options: [
			{
				name: 'filter',
				displayName: 'Filter',
				values: [
					{
						displayName: 'Field Name or ID',
						name: 'fieldName',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Operator',
						name: 'operator',
						type: 'options',
						default: 'equal',
						// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
						options: [
							{ name: 'Equal', value: 'equal' },
							{ name: 'Not Equal', value: 'notEqual' },
							{ name: 'Greater Than', value: 'greaterThen' },
							{ name: 'Less Than', value: 'lesserThen' },
							{ name: 'Greater or Equal', value: 'greaterOrEqual' },
							{ name: 'Less or Equal', value: 'lesserOrEqual' },
							{ name: 'Like', value: 'like' },
							{ name: 'In', value: 'in' },
							{ name: 'Not In', value: 'notIn' },
							{ name: 'Child Of', value: 'childOf' },
						],
					},
					{ displayName: 'Value', name: 'value', type: 'string', default: '' },
				],
			},
		],
	},
];

const displayOptions = {
	show: { resource: ['custom'], operation: ['getAll'] },
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		try {
			const model = this.getNodeParameter('customResource', i, undefined, {
				extractValue: true,
			}) as string;
			const filters = this.getNodeParameter('filters', i) as unknown as IOdooFilters;
			const returnAll = this.getNodeParameter('returnAll', i) as boolean;
			const options = this.getNodeParameter('options', i) as IDataObject;

			const fieldsRaw = (options.fieldsList as string) ?? '';
			const fields = fieldsRaw
				? fieldsRaw
						.split(',')
						.map((f) => f.trim())
						.filter(Boolean)
				: [];

			const body: IDataObject = { domain: buildDomain(filters), fields, offset: 0 };
			if (!returnAll) body.limit = this.getNodeParameter('limit', i) as number;

			const response = (await odooApiRequest.call(
				this,
				model,
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
