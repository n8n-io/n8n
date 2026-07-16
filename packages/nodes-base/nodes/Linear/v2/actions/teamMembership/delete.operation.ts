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
		displayName: 'Team Membership ID',
		name: 'teamMembershipId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the team membership to delete',
	},
];

const displayOptions = {
	show: {
		resource: ['teamMembership'],
		operation: ['delete'],
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
			const teamMembershipId = this.getNodeParameter('teamMembershipId', i) as string;

			const body = {
				query: `mutation TeamMembershipDelete($teamMembershipId: String!) {
					teamMembershipDelete(id: $teamMembershipId) {
						success
					}
				}`,
				variables: { teamMembershipId },
			};

			const responseData = await linearApiRequest.call(this, body);
			const result = (responseData as { data: { teamMembershipDelete: IDataObject } }).data
				.teamMembershipDelete;

			returnData.push(
				...this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(result as IDataObject),
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
