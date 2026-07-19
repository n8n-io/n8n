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
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		description: 'The name of the release',
	},
	{
		displayName: 'Pipeline ID',
		name: 'pipelineId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the release pipeline this release belongs to',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		options: [
			{
				displayName: 'Version',
				name: 'version',
				type: 'string',
				default: '',
				description: 'The version identifier, e.g. v1.2.3',
			},
			{
				displayName: 'Target Date',
				name: 'targetDate',
				type: 'dateTime',
				default: '',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['release'],
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
			const name = this.getNodeParameter('name', i) as string;
			const pipelineId = this.getNodeParameter('pipelineId', i) as string;
			const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

			const body = {
				query: `mutation ReleaseCreate($name: String!, $pipelineId: String!, $version: String, $targetDate: TimelessDate) {
					releaseCreate(input: {
						name: $name
						pipelineId: $pipelineId
						version: $version
						targetDate: $targetDate
					}) {
						success
						release {
							${RELEASE_FIELDS}
						}
					}
				}`,
				variables: { name, pipelineId, ...additionalFields },
			};

			const responseData = await linearApiRequest.call(this, body);
			const release = (responseData as { data: { releaseCreate: { release: IDataObject } } }).data
				.releaseCreate?.release;

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
