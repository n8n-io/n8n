import type { INodeProperties, IExecuteFunctions, IDataObject } from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../utils/utilities';
import { splunkApiJsonRequest } from '../../transport';

const properties: INodeProperties[] = [];

const displayOptions = {
	show: {
		resource: ['alert'],
		operation: ['getMetrics'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	_i: number,
): Promise<IDataObject | IDataObject[]> {
	const endpoint = '/services/alerts/metric_alerts';
	const returnData = await splunkApiJsonRequest.call(this, 'GET', endpoint);

	return returnData;
}
