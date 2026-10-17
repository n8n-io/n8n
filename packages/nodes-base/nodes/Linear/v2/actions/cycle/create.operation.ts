import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { TEAM_LOCATOR } from '../../../shared/constants';
import { linearApiRequest } from '../../../shared/GenericFunctions';
import { updateDisplayOptions } from '../../../../../utils/utilities';

const properties: INodeProperties[] = [
	TEAM_LOCATOR,
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
	i: number,
): Promise<IDataObject | IDataObject[]> {
	const teamId = this.getNodeParameter('teamId', i, '', { extractValue: true }) as string;
	const startsAt = this.getNodeParameter('startsAt', i) as string;
	const endsAt = this.getNodeParameter('endsAt', i) as string;
	const additionalFields = this.getNodeParameter('additionalFields', i) as Record<string, unknown>;

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
	const cycle = (responseData as { data: { cycleCreate: { cycle: IDataObject } } }).data.cycleCreate
		?.cycle;

	return cycle;
}
