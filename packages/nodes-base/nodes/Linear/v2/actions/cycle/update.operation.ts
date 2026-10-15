import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { CYCLE_LOCATOR } from '../../../shared/constants';
import { linearApiRequest } from '../../../shared/GenericFunctions';
import { updateDisplayOptions } from '../../../../../utils/utilities';

const properties: INodeProperties[] = [
	CYCLE_LOCATOR,
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
	i: number,
): Promise<IDataObject | IDataObject[]> {
	const cycleId = this.getNodeParameter('cycleId', i, '', { extractValue: true }) as string;
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
	return (responseData as { data: { cycleUpdate: { cycle: IDataObject } } }).data.cycleUpdate.cycle;
}
