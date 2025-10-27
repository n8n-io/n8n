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
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		options: [
			{
				displayName: 'Add Orphan Field',
				name: 'add_orphan_field',
				description:
					'Whether to include a boolean value for each saved search to show whether the search is orphaned, meaning that it has no valid owner',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'List Default Actions',
				name: 'listDefaultActionArgs',
				type: 'boolean',
				default: false,
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['report'],
		operation: ['getAll'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	i: number,
): Promise<IDataObject | IDataObject[]> {
	// https://docs.splunk.com/Documentation/Splunk/8.2.2/RESTREF/RESTsearch#saved.2Fsearches

	const qs = {} as IDataObject;
	const options = this.getNodeParameter('options', i);

	populate(options, qs);
	setReturnAllOrLimit.call(this, qs);

	const endpoint = '/services/saved/searches';
	const returnData = await splunkApiJsonRequest.call(this, 'GET', endpoint, {}, qs);

	return returnData;
}
