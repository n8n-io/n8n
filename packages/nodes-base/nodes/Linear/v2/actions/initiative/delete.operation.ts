import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { linearApiRequest } from '../../../shared/GenericFunctions';
import { updateDisplayOptions } from '../../../../../utils/utilities';

const properties: INodeProperties[] = [
	{
		displayName: 'Initiative',
		name: 'initiativeId',
		type: 'resourceLocator',
		required: true,
		default: { mode: 'list', value: '' },
		description: 'The initiative to delete',
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
];

const displayOptions = {
	show: {
		resource: ['initiative'],
		operation: ['delete'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	i: number,
): Promise<IDataObject | IDataObject[]> {
	const initiativeId = this.getNodeParameter('initiativeId', i, '', {
		extractValue: true,
	}) as string;

	const body = {
		query: `mutation InitiativeDelete($initiativeId: String!) {
			initiativeDelete(id: $initiativeId) {
				success
			}
		}`,
		variables: { initiativeId },
	};

	const responseData = await linearApiRequest.call(this, body);
	const result = (responseData as { data: { initiativeDelete: IDataObject } }).data
		.initiativeDelete;

	return result;
}
