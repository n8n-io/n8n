import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { USER_LOCATOR } from '../../../shared/constants';
import { linearApiRequest } from '../../../shared/GenericFunctions';
import { updateDisplayOptions } from '../../../../../utils/utilities';

const properties: INodeProperties[] = [USER_LOCATOR];

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
	const userId = this.getNodeParameter('userId', i, '', { extractValue: true }) as string;

	const body = {
		query: `query User($userId: String!) {
			user(id: $userId) {
				id
				name
				displayName
				email
				avatarUrl
				active
				admin
				createdAt
				updatedAt
			}
		}`,
		variables: { userId },
	};

	const responseData = await linearApiRequest.call(this, body);
	const user = (responseData as { data: { user: IDataObject } }).data.user;

	return user as IDataObject;
}
