import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { PIPELINE_LOCATOR, RELEASE_FIELDS } from '../../../shared/constants';
import { linearApiRequest, normalizeTimelessDates } from '../../../shared/GenericFunctions';
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
	PIPELINE_LOCATOR,
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
				typeOptions: { dateOnly: true },
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
	i: number,
): Promise<IDataObject | IDataObject[]> {
	const name = this.getNodeParameter('name', i) as string;
	const pipelineId = this.getNodeParameter('pipelineId', i, '', {
		extractValue: true,
	}) as string;
	const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
	normalizeTimelessDates(additionalFields);

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

	return release;
}
