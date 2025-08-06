import type { INodeProperties, IExecuteFunctions, IDataObject } from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../utils/utilities';
import { searchJobRLC } from '../../helpers/descriptions';
import { formatFeed } from '../../helpers/utils';
import { splunkApiJsonRequest, splunkApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	searchJobRLC,
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		description: 'The name of the report',
	},
];

const displayOptions = {
	show: {
		resource: ['report'],
		operation: ['create'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	i: number,
): Promise<IDataObject | IDataObject[]> {
	const name = this.getNodeParameter('name', i) as string;
	const searchJobId = this.getNodeParameter('searchJobId', i, '', { extractValue: true }) as string;
	const endpoint = `/services/search/jobs/${searchJobId}`;

	const searchJob = ((await splunkApiJsonRequest.call(this, 'GET', endpoint)) ?? [])[0];

	const body: IDataObject = {
		name,
		search: searchJob.search,
		alert_type: 'always',
		'dispatch.earliest_time': searchJob.earliestTime,
		'dispatch.latest_time': searchJob.latestTime,
		is_scheduled: searchJob.isScheduled,
		cron_schedule: searchJob.cronSchedule,
	};

	const returnData = await splunkApiRequest
		.call(this, 'POST', '/services/saved/searches', body)
		.then(formatFeed);

	return returnData;
}
