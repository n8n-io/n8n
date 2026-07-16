import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { INITIATIVE_FIELDS } from '../../../shared/constants';
import { linearApiRequest } from '../../../shared/GenericFunctions';
import { updateDisplayOptions } from '../../../../../utils/utilities';

const properties: INodeProperties[] = [
	{
		displayName: 'Initiative',
		name: 'initiativeId',
		type: 'resourceLocator',
		required: true,
		default: { mode: 'list', value: '' },
		description: 'The initiative to update',
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: { searchListMethod: 'getInitiatives', searchable: true },
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				hint: 'Enter the initiative ID',
			},
		],
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
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
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Target Date',
				name: 'targetDate',
				type: 'dateTime',
				default: '',
				description: 'The estimated completion date of the initiative',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['initiative'],
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
			const initiativeId = this.getNodeParameter('initiativeId', i, '', {
				extractValue: true,
			}) as string;
			const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

			const body = {
				query: `mutation InitiativeUpdate($initiativeId: String!, $name: String, $description: String, $targetDate: TimelessDate) {
					initiativeUpdate(id: $initiativeId, input: {
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
				variables: { initiativeId, ...updateFields },
			};

			const responseData = await linearApiRequest.call(this, body);
			const initiative = (
				responseData as { data: { initiativeUpdate: { initiative: IDataObject } } }
			).data.initiativeUpdate?.initiative;

			returnData.push(
				...this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(initiative), {
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
