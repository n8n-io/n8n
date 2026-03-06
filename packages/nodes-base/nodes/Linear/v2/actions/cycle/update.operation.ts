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
		displayName: 'Cycle ID',
		name: 'cycleId',
		type: 'string',
		required: true,
		default: '',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		options: [
			{
				displayName: 'End Date',
				name: 'endsAt',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Start Date',
				name: 'startsAt',
				type: 'dateTime',
				default: '',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['cycle'],
		operation: ['update'],
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
			const cycleId = this.getNodeParameter('cycleId', i) as string;
			const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

			const body = {
				query: `mutation CycleUpdate($cycleId: String!, $name: String, $startsAt: DateTime, $endsAt: DateTime) {
					cycleUpdate(id: $cycleId, input: {
						name: $name
						startsAt: $startsAt
						endsAt: $endsAt
					}) {
						success
						cycle {
							id
							name
							number
							startsAt
							endsAt
							updatedAt
						}
					}
				}`,
				variables: { cycleId, ...updateFields },
			};

			const responseData = await linearApiRequest.call(this, body);
			const cycleUpdate = (
				responseData as { data: { cycleUpdate: { success: boolean; cycle: IDataObject } } }
			).data.cycleUpdate;
			const result = cycleUpdate?.cycle ?? (cycleUpdate as unknown as IDataObject);

			returnData.push(
				...this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(result), {
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
