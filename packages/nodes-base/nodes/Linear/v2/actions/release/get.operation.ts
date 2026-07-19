import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { RELEASE_FIELDS } from '../../../shared/constants';
import { linearApiRequest } from '../../../shared/GenericFunctions';
import { updateDisplayOptions } from '../../../../../utils/utilities';

const properties: INodeProperties[] = [
	{
		displayName: 'Release ID',
		name: 'releaseId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the release to retrieve',
	},
];

const displayOptions = {
	show: {
		resource: ['release'],
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
			const releaseId = this.getNodeParameter('releaseId', i) as string;

			const body = {
				query: `query Release($releaseId: String!) {
					release(id: $releaseId) {
						${RELEASE_FIELDS}
					}
				}`,
				variables: { releaseId },
			};

			const responseData = await linearApiRequest.call(this, body);
			const release = (responseData as { data: { release: IDataObject } }).data.release;

			returnData.push(
				...this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(release), {
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
