import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { CUSTOM_VIEW_FIELDS, VIEW_LOCATOR } from '../../../shared/constants';
import { linearApiRequest } from '../../../shared/GenericFunctions';
import { updateDisplayOptions } from '../../../../../utils/utilities';

const properties: INodeProperties[] = [VIEW_LOCATOR];

const displayOptions = {
	show: {
		resource: ['view'],
		operation: ['get'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	i: number,
): Promise<IDataObject | IDataObject[]> {
	const viewId = this.getNodeParameter('viewId', i, '', { extractValue: true }) as string;

	const body = {
		query: `query CustomView($viewId: String!) {
			customView(id: $viewId) {
				${CUSTOM_VIEW_FIELDS}
			}
		}`,
		variables: { viewId },
	};

	const responseData = await linearApiRequest.call(this, body);
	const customView = (responseData as { data: { customView: IDataObject } }).data.customView;

	return customView;
}
