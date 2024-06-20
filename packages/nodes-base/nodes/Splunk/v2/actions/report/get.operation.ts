import type { INodeProperties, IExecuteFunctions, IDataObject } from 'n8n-workflow';
import { updateDisplayOptions } from '../../../../../utils/utilities';
import { splunkApiRequest } from '../../transport';
import { formatFeed, getId } from '../../helpers/utils';

const properties: INodeProperties[] = [
	{
		displayName: 'Search Configuration ID',
		name: 'searchConfigurationId',
		description: 'ID of the search configuration to retrieve',
		type: 'string',
		required: true,
		default: '',
	},
];

const displayOptions = {
	show: {
		resource: ['report'],
		operation: ['get'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	i: number,
): Promise<IDataObject | IDataObject[]> {
	// https://docs.splunk.com/Documentation/Splunk/8.2.2/RESTREF/RESTsearch#saved.2Fsearches.2F.7Bname.7D

	const partialEndpoint = '/services/saved/searches/';
	const searchConfigurationId = getId.call(
		this,
		i,
		'searchConfigurationId',
		'/search/saved/searches/',
	); // id endpoint differs from operation endpoint
	const endpoint = `${partialEndpoint}/${searchConfigurationId}`;

	const returnData = await splunkApiRequest.call(this, 'GET', endpoint).then(formatFeed);

	return returnData;
}
