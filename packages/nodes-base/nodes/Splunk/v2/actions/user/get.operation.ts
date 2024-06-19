import type { INodeProperties, IExecuteFunctions, IDataObject } from 'n8n-workflow';
import { updateDisplayOptions } from '../../../../../utils/utilities';
import { splunkApiRequest } from '../../transport';
import { formatFeed, getId } from '../../helpers/utils';

const properties: INodeProperties[] = [
	{
		displayName: 'User ID',
		name: 'userId',
		description: 'ID of the user to retrieve',
		type: 'string',
		required: true,
		default: '',
	},
];

const displayOptions = {
	show: {
		resource: ['user'],
		operation: ['get'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	i: number,
): Promise<IDataObject | IDataObject[]> {
	// https://docs.splunk.com/Documentation/Splunk/8.2.2/RESTREF/RESTaccess#authentication.2Fusers.2F.7Bname.7D

	const partialEndpoint = '/services/authentication/users/';
	const userId = getId.call(this, i, 'userId', '/services/authentication/users/');
	const endpoint = `${partialEndpoint}/${userId}`;
	const returnData = await splunkApiRequest.call(this, 'GET', endpoint).then(formatFeed);

	return returnData;
}
