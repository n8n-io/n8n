import type { INodeProperties, IExecuteFunctions, IDataObject } from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../utils/utilities';
import { setReturnAllOrLimit } from '../../helpers/utils';
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
];

const displayOptions = {
	show: {
		resource: ['user'],
		operation: ['getAll'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	_i: number,
): Promise<IDataObject | IDataObject[]> {
	// https://docs.splunk.com/Documentation/Splunk/8.2.2/RESTREF/RESTaccess#authentication.2Fusers

	const qs = {} as IDataObject;
	setReturnAllOrLimit.call(this, qs);

	const endpoint = '/services/authentication/users';
	const returnData = await splunkApiJsonRequest.call(this, 'GET', endpoint, {}, qs);

	return returnData;
}
