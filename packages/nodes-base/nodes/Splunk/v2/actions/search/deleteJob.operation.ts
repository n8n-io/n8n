import type { INodeProperties, IExecuteFunctions, IDataObject } from 'n8n-workflow';
import { updateDisplayOptions } from '../../../../../utils/utilities';
import { splunkApiRequest } from '../../transport';
import { getId } from '../../helpers/utils';

const properties: INodeProperties[] = [
	{
		displayName: 'Search ID',
		name: 'searchJobId',
		description: 'ID of the search job to delete',
		type: 'string',
		required: true,
		default: '',
	},
];

const displayOptions = {
	show: {
		resource: ['search'],
		operation: ['deleteJob'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	i: number,
): Promise<IDataObject | IDataObject[]> {
	// https://docs.splunk.com/Documentation/Splunk/8.2.2/RESTREF/RESTsearch#search.2Fjobs.2F.7Bsearch_id.7D

	const partialEndpoint = '/services/search/jobs/';
	const searchJobId = getId.call(this, i, 'searchJobId', partialEndpoint);
	const endpoint = `${partialEndpoint}/${searchJobId}`;
	const returnData = await splunkApiRequest.call(this, 'DELETE', endpoint);

	return returnData;
}
