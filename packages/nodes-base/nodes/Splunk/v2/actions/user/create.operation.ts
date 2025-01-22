import type { INodeProperties, IExecuteFunctions, IDataObject } from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../utils/utilities';
import type { SplunkFeedResponse } from '../../helpers/interfaces';
import { formatFeed, populate } from '../../helpers/utils';
import { splunkApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName: 'Name',
		name: 'name',
		description: 'Login name of the user',
		type: 'string',
		required: true,
		default: '',
	},
	{
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-multi-options
		displayName: 'Roles',
		name: 'roles',
		type: 'multiOptions',
		description:
			'Comma-separated list of roles to assign to the user. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		required: true,
		default: ['user'],
		typeOptions: {
			loadOptionsMethod: 'getRoles',
		},
	},
	{
		displayName: 'Password',
		name: 'password',
		type: 'string',
		typeOptions: { password: true },
		required: true,
		default: '',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		options: [
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
			},
			{
				displayName: 'Full Name',
				name: 'realname',
				type: 'string',
				default: '',
				description: 'Full name of the user',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['user'],
		operation: ['create'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	i: number,
): Promise<IDataObject | IDataObject[]> {
	// https://docs.splunk.com/Documentation/Splunk/8.2.2/RESTREF/RESTaccess#authentication.2Fusers

	const roles = this.getNodeParameter('roles', i) as string[];

	const body = {
		name: this.getNodeParameter('name', i),
		roles,
		password: this.getNodeParameter('password', i),
	} as IDataObject;

	const additionalFields = this.getNodeParameter('additionalFields', i);

	populate(additionalFields, body);

	const endpoint = '/services/authentication/users';
	const responseData = (await splunkApiRequest.call(
		this,
		'POST',
		endpoint,
		body,
	)) as SplunkFeedResponse;
	const returnData = formatFeed(responseData);

	return returnData;
}
