import type { INodeProperties, IExecuteFunctions, IDataObject } from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../utils/utilities';
import { searchJobRLC } from '../../helpers/descriptions';
import { splunkApiJsonRequest } from '../../transport';

const properties: INodeProperties[] = [searchJobRLC];

const displayOptions = {
	show: {
		resource: ['search'],
		operation: ['get'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	i: number,
): Promise<IDataObject | IDataObject[]> {
	// https://docs.splunk.com/Documentation/Splunk/8.2.2/RESTREF/RESTsearch#search.2Fjobs.2F.7Bsearch_id.7D

	const searchJobId = this.getNodeParameter('searchJobId', i, '', { extractValue: true }) as string;
	const endpoint = `/services/search/jobs/${searchJobId}`;

	const returnData = await splunkApiJsonRequest.call(this, 'GET', endpoint);

	return returnData;
}
