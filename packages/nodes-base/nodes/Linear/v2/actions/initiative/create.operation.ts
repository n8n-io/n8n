import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { INITIATIVE_FIELDS } from '../../../shared/constants';
import { linearApiRequest, normalizeTimelessDates } from '../../../shared/GenericFunctions';
import { updateDisplayOptions } from '../../../../../utils/utilities';

const properties: INodeProperties[] = [
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		description: 'The name of the initiative',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		options: [
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				typeOptions: { rows: 4 },
				default: '',
			},
			{
				displayName: 'Target Date',
				name: 'targetDate',
				type: 'dateTime',
				typeOptions: { dateOnly: true },
				default: '',
				description: 'The estimated completion date of the initiative',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['initiative'],
		operation: ['create'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	i: number,
): Promise<IDataObject | IDataObject[]> {
	const name = this.getNodeParameter('name', i) as string;
	const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
	normalizeTimelessDates(additionalFields);

	const body = {
		query: `mutation InitiativeCreate($name: String!, $description: String, $targetDate: TimelessDate) {
			initiativeCreate(input: {
				name: $name
				description: $description
				targetDate: $targetDate
			}) {
				success
				initiative {
					${INITIATIVE_FIELDS}
				}
			}
		}`,
		variables: { name, ...additionalFields },
	};

	const responseData = await linearApiRequest.call(this, body);
	const initiative = (responseData as { data: { initiativeCreate: { initiative: IDataObject } } })
		.data.initiativeCreate?.initiative;

	return initiative;
}
