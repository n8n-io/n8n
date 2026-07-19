import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { CUSTOM_VIEW_FIELDS } from '../../../shared/constants';
import { linearApiRequest } from '../../../shared/GenericFunctions';
import { updateDisplayOptions } from '../../../../../utils/utilities';

const properties: INodeProperties[] = [
	{
		displayName: 'View ID',
		name: 'viewId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the view to retrieve',
	},
];

const displayOptions = {
	show: {
		resource: ['view'],
		operation: ['get'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		try {
			const viewId = this.getNodeParameter('viewId', i) as string;

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

			returnData.push(
				...this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(customView), {
					itemData: { item: i },
				}),
			);
		} catch (error) {
			if (this.continueOnFail()) {
				returnData.push(
					...this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray({ error: (error as Error).message }),
						{ itemData: { item: i } },
					),
				);
				continue;
			}
			throw error;
		}
	}
	return returnData;
}
