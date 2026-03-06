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
		displayName: 'Start Date',
		name: 'startsAt',
		type: 'dateTime',
		required: true,
		default: '',
	},
	{
		displayName: 'End Date',
		name: 'endsAt',
		type: 'dateTime',
		required: true,
		default: '',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		options: [
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['cycle'],
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
			const startsAt = this.getNodeParameter('startsAt', i) as string;
			const endsAt = this.getNodeParameter('endsAt', i) as string;
			const additionalFields = this.getNodeParameter('additionalFields', i) as Record<
				string,
				unknown
			>;

			const body = {
				query: `mutation CycleCreate($teamId: String!, $startsAt: DateTime!, $endsAt: DateTime!, $name: String) {
					cycleCreate(input: {
						teamId: $teamId
						startsAt: $startsAt
						endsAt: $endsAt
						name: $name
					}) {
						success
						cycle {
							id
							name
							number
							startsAt
							endsAt
							createdAt
							updatedAt
						}
					}
				}`,
				variables: {
					teamId,
					startsAt,
					endsAt,
					...additionalFields,
				},
			};

			const responseData = await linearApiRequest.call(this, body);
			const cycle = (responseData as { data: { cycleCreate: { cycle: IDataObject } } }).data
				.cycleCreate?.cycle;

			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(cycle),
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
