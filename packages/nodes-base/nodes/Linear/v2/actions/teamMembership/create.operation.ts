import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { TEAM_LOCATOR, USER_LOCATOR } from '../../../shared/constants';
import { linearApiRequest } from '../../../shared/GenericFunctions';
import { updateDisplayOptions } from '../../../../../utils/utilities';

const properties: INodeProperties[] = [TEAM_LOCATOR, USER_LOCATOR];

const displayOptions = {
	show: {
		resource: ['teamMembership'],
		operation: ['create'],
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
			const teamId = this.getNodeParameter('teamId', i, '', { extractValue: true }) as string;
			const userId = this.getNodeParameter('userId', i, '', { extractValue: true }) as string;

			const body = {
				query: `mutation TeamMembershipCreate($teamId: String!, $userId: String!) {
					teamMembershipCreate(input: {
						teamId: $teamId
						userId: $userId
					}) {
						success
						teamMembership {
							id
							createdAt
							team {
								id
								name
							}
							user {
								id
								displayName
								email
							}
						}
					}
				}`,
				variables: { teamId, userId },
			};

			const responseData = await linearApiRequest.call(this, body);
			const membership = (
				responseData as {
					data: { teamMembershipCreate: { teamMembership: IDataObject } };
				}
			).data.teamMembershipCreate?.teamMembership;

			returnData.push(
				...this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(membership as IDataObject),
					{
						itemData: { item: i },
					},
				),
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
