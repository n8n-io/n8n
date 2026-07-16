import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

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

export async function execute(
	this: IExecuteFunctions,
	_items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];

	try {
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

		const executionData = this.helpers.constructExecutionMetaData(
			this.helpers.returnJsonArray(user as IDataObject),
			{ itemData: { item: 0 } },
		);
		returnData.push(...executionData);
	} catch (error) {
		if (this.continueOnFail()) {
			returnData.push(
				...this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray({ error: (error as Error).message }),
					{ itemData: { item: 0 } },
				),
			);
		} else {
			throw error;
		}
	}

	return returnData;
}
