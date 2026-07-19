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
		description: 'The ID of the release to update',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
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
			{
				displayName: 'Target Date',
				name: 'targetDate',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Version',
				name: 'version',
				type: 'string',
				default: '',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['release'],
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
			const releaseId = this.getNodeParameter('releaseId', i) as string;
			const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

			const body = {
				query: `mutation ReleaseUpdate($releaseId: String!, $name: String, $version: String, $targetDate: TimelessDate) {
					releaseUpdate(id: $releaseId, input: {
						name: $name
						version: $version
						targetDate: $targetDate
					}) {
						success
						release {
							${RELEASE_FIELDS}
						}
					}
				}`,
				variables: { releaseId, ...updateFields },
			};

			const responseData = await linearApiRequest.call(this, body);
			const release = (responseData as { data: { releaseUpdate: { release: IDataObject } } }).data
				.releaseUpdate?.release;

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
