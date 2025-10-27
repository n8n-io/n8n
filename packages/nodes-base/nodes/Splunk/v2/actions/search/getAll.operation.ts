import type { INodeProperties, IExecuteFunctions, IDataObject } from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../utils/utilities';
import { populate, setReturnAllOrLimit } from '../../helpers/utils';
import { splunkApiJsonRequest } from '../../transport';

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
		description: 'Max number of results to return',
		typeOptions: {
			minValue: 1,
		},
		displayOptions: {
			show: {
				returnAll: [false],
			},
		},
	},
	{
		displayName: 'Sort',
		name: 'sort',
		type: 'fixedCollection',
		default: {},
		options: [
			{
				displayName: 'Values',
				name: 'values',
				values: [
					{
						displayName: 'Sort Direction',
						name: 'sort_dir',
						type: 'options',
						options: [
							{
								name: 'Ascending',
								value: 'asc',
							},
							{
								name: 'Descending',
								value: 'desc',
							},
						],
						default: 'asc',
					},
					{
						displayName: 'Sort Key',
						name: 'sort_key',
						description: 'Key name to use for sorting',
						type: 'string',
						placeholder: 'e.g. diskUsage',
						default: '',
					},
					{
						displayName: 'Sort Mode',
						name: 'sort_mode',
						type: 'options',
						options: [
							{
								name: 'Automatic',
								value: 'auto',
								description:
									'If all field values are numeric, collate numerically. Otherwise, collate alphabetically.',
							},
							{
								name: 'Alphabetic',
								value: 'alpha',
								description: 'Collate alphabetically, case-insensitive',
							},
							{
								name: 'Alphabetic and Case-Sensitive',
								value: 'alpha_case',
								description: 'Collate alphabetically, case-sensitive',
							},
							{
								name: 'Numeric',
								value: 'num',
								description: 'Collate numerically',
							},
						],
						default: 'auto',
					},
				],
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['search'],
		operation: ['getAll'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	i: number,
): Promise<IDataObject | IDataObject[]> {
	// https://docs.splunk.com/Documentation/Splunk/8.2.2/RESTREF/RESTsearch#search.2Fjobs

	const qs = {} as IDataObject;
	const sort = this.getNodeParameter('sort.values', i, {}) as IDataObject;

	populate(sort, qs);
	setReturnAllOrLimit.call(this, qs);

	const endpoint = '/services/search/jobs';
	const returnData = await splunkApiJsonRequest.call(this, 'GET', endpoint, {}, qs);

	return returnData;
}
