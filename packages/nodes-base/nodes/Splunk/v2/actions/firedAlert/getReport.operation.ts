import type { INodeProperties, IExecuteFunctions, IDataObject } from 'n8n-workflow';
import { updateDisplayOptions } from '../../../../../utils/utilities';
import { splunkApiRequest } from '../../transport';
import { formatFeed } from '../../helpers/utils';

const properties: INodeProperties[] = [];

const displayOptions = {
	show: {
		resource: ['findAlert'],
		operation: ['getReport'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	_i: number,
): Promise<IDataObject | IDataObject[]> {
	// https://docs.splunk.com/Documentation/Splunk/latest/RESTREF/RESTsearch#alerts.2Ffired_alerts

	const endpoint = '/services/alerts/fired_alerts';
	const returnData = await splunkApiRequest.call(this, 'GET', endpoint).then(formatFeed);

	return returnData;
}
