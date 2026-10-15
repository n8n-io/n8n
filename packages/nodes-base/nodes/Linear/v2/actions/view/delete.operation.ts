import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { VIEW_LOCATOR } from '../../../shared/constants';
import { linearApiRequest } from '../../../shared/GenericFunctions';
import { updateDisplayOptions } from '../../../../../utils/utilities';

const properties: INodeProperties[] = [VIEW_LOCATOR];

const displayOptions = {
	show: {
		resource: ['view'],
		operation: ['delete'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	i: number,
): Promise<IDataObject | IDataObject[]> {
	const viewId = this.getNodeParameter('viewId', i, '', { extractValue: true }) as string;

	const body = {
		query: `mutation CustomViewDelete($viewId: String!) {
			customViewDelete(id: $viewId) {
				success
			}
		}`,
		variables: { viewId },
	};

	const responseData = await linearApiRequest.call(this, body);
	const result = (responseData as { data: { customViewDelete: IDataObject } }).data
		.customViewDelete;

	return result;
}
