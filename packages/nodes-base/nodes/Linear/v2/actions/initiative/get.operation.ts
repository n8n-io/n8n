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
		description: 'The initiative to retrieve',
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
		operation: ['get'],
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
				query: `query Initiative($initiativeId: String!) {
					initiative(id: $initiativeId) {
						${INITIATIVE_FIELDS}
					}
				}`,
				variables: { initiativeId },
			};

			const responseData = await linearApiRequest.call(this, body);
			const initiative = (responseData as { data: { initiative: IDataObject } }).data.initiative;

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
