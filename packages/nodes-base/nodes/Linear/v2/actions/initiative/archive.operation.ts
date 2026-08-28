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
		displayName: 'Initiative',
		name: 'initiativeId',
		type: 'resourceLocator',
		required: true,
		default: { mode: 'list', value: '' },
		description: 'The initiative to archive',
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
		operation: ['archive'],
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

			const body = {
				query: `mutation InitiativeArchive($initiativeId: String!) {
					initiativeArchive(id: $initiativeId) {
						success
					}
				}`,
				variables: { initiativeId },
			};

			const responseData = await linearApiRequest.call(this, body);
			const result = (responseData as { data: { initiativeArchive: IDataObject } }).data
				.initiativeArchive;

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
