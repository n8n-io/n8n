import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { linearApiRequest } from '../../../shared/GenericFunctions';
import { updateDisplayOptions } from '../../../../../utils/utilities';

const properties: INodeProperties[] = [
	{
		displayName: 'User ID',
		name: 'userId',
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
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		try {
			const userId = this.getNodeParameter('userId', i) as string;

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

			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(user as IDataObject),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
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
