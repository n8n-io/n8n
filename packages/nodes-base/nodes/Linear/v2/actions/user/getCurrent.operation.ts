import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { linearApiRequest } from '../../../shared/GenericFunctions';
import { updateDisplayOptions } from '../../../../../utils/utilities';

const properties: INodeProperties[] = [];

const displayOptions = {
	show: {
		resource: ['user'],
		operation: ['getCurrent'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions): Promise<IDataObject> {
	const body = {
		query: `query Viewer {
			viewer {
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
		variables: {},
	};

	const responseData = await linearApiRequest.call(this, body);
	const user = (responseData as { data: { viewer: IDataObject } }).data.viewer;

	return user as IDataObject;
}
