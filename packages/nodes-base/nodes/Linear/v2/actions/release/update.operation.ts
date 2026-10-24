import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { RELEASE_FIELDS, RELEASE_LOCATOR } from '../../../shared/constants';
import { linearApiRequest, normalizeTimelessDates } from '../../../shared/GenericFunctions';
import { updateDisplayOptions } from '../../../../../utils/utilities';

const properties: INodeProperties[] = [
	RELEASE_LOCATOR,
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
				typeOptions: { dateOnly: true },
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
	i: number,
): Promise<IDataObject | IDataObject[]> {
	const releaseId = this.getNodeParameter('releaseId', i, '', { extractValue: true }) as string;
	const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;
	normalizeTimelessDates(updateFields);

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

	return release;
}
