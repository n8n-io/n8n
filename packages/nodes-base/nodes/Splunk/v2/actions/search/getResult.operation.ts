import type { INodeProperties, IExecuteFunctions, IDataObject } from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../utils/utilities';
import { searchJobRLC } from '../../helpers/descriptions';
import { populate, setReturnAllOrLimit } from '../../helpers/utils';
import { splunkApiJsonRequest } from '../../transport';

const properties: INodeProperties[] = [
	searchJobRLC,
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
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		options: [
			{
				displayName: 'Key-Value Match',
				name: 'keyValueMatch',
				description:
					'Key-value pair to match against. Example: if "Key" is set to <code>user</code> and "Field" is set to <code>john</code>, only the results where <code>user</code> is <code>john</code> will be returned.',
				type: 'fixedCollection',
				default: {},
				placeholder: 'Add Key-Value Pair',
				options: [
					{
						displayName: 'Key-Value Pair',
						name: 'keyValuePair',
						values: [
							{
								displayName: 'Key',
								name: 'key',
								description: 'Key to match against',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Value',
								name: 'value',
								description: 'Value to match against',
								type: 'string',
								default: '',
							},
						],
					},
				],
			},
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		options: [
			{
				displayName: 'Add Summary to Metadata',
				name: 'add_summary_to_metadata',
				description: 'Whether to include field summary statistics in the response',
				type: 'boolean',
				default: false,
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['search'],
		operation: ['getResult'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	i: number,
): Promise<IDataObject | IDataObject[]> {
	// https://docs.splunk.com/Documentation/Splunk/latest/RESTREF/RESTsearch#search.2Fjobs.2F.7Bsearch_id.7D.2Fresults

	const searchJobId = this.getNodeParameter('searchJobId', i, '', { extractValue: true }) as string;

	const qs = {} as IDataObject;
	const filters = this.getNodeParameter('filters', i) as IDataObject & {
		keyValueMatch?: { keyValuePair?: { key: string; value: string } };
	};
	const options = this.getNodeParameter('options', i);

	const keyValuePair = filters?.keyValueMatch?.keyValuePair;

	if (keyValuePair?.key && keyValuePair?.value) {
		qs.search = `search ${keyValuePair.key}=${keyValuePair.value}`;
	}

	populate(options, qs);
	setReturnAllOrLimit.call(this, qs);

	const endpoint = `/services/search/jobs/${searchJobId}/results`;
	const returnData = await splunkApiJsonRequest.call(this, 'GET', endpoint, {}, qs);

	return returnData;
}
