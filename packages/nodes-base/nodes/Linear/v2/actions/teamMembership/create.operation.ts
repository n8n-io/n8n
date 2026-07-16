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
		displayName: 'Team Name or ID',
		name: 'teamId',
		type: 'options',
		required: true,
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		typeOptions: { loadOptionsMethod: 'getTeams' },
		default: '',
	},
	{
		displayName: 'User Name or ID',
		name: 'userId',
		type: 'options',
		required: true,
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		typeOptions: { loadOptionsMethod: 'getUsers' },
		default: '',
	},
];

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
			const teamId = this.getNodeParameter('teamId', i) as string;
			const userId = this.getNodeParameter('userId', i) as string;

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
