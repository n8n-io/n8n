import type { INodeProperties, IExecuteFunctions, IDataObject } from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../utils/utilities';
import { userRLC } from '../../helpers/descriptions';
import { splunkApiRequest } from '../../transport';

const properties: INodeProperties[] = [userRLC];

const displayOptions = {
	show: {
		resource: ['user'],
		operation: ['deleteUser'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	i: number,
): Promise<IDataObject | IDataObject[]> {
	// https://docs.splunk.com/Documentation/Splunk/8.2.2/RESTREF/RESTaccess#authentication.2Fusers.2F.7Bname.7D

	const userId = this.getNodeParameter('userId', i, '', { extractValue: true }) as string;
	const endpoint = `/services/authentication/users/${userId}`;

	await splunkApiRequest.call(this, 'DELETE', endpoint);

	return { success: true };
}
