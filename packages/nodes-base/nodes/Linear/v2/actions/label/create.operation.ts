import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { TEAM_LOCATOR } from '../../../shared/constants';
import { linearApiRequest } from '../../../shared/GenericFunctions';
import { updateDisplayOptions } from '../../../../../utils/utilities';

const properties: INodeProperties[] = [
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
	},
	{
		...TEAM_LOCATOR,
		required: false,
		description: 'The team the label belongs to. Leave empty to create a workspace label.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		options: [
			{
				displayName: 'Color',
				name: 'color',
				type: 'color',
				default: '#000000',
				description: 'The label color as a hex code',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['label'],
		operation: ['create'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	i: number,
): Promise<IDataObject | IDataObject[]> {
	const name = this.getNodeParameter('name', i) as string;
	const teamId = this.getNodeParameter('teamId', i, '', { extractValue: true }) as string;
	const additionalFields = this.getNodeParameter('additionalFields', i) as Record<string, unknown>;

	const body = {
		query: `mutation IssueLabelCreate($name: String!, $teamId: String, $color: String, $description: String) {
			issueLabelCreate(input: {
				name: $name
				teamId: $teamId
				color: $color
				description: $description
			}) {
				success
				issueLabel {
					id
					name
					color
					description
					createdAt
				}
			}
		}`,
		variables: {
			name,
			// Omitting the team creates a workspace-wide label
			teamId: teamId || undefined,
			...additionalFields,
		},
	};

	const responseData = await linearApiRequest.call(this, body);
	const label = (responseData as { data: { issueLabelCreate: { issueLabel: IDataObject } } }).data
		.issueLabelCreate?.issueLabel;

	return label;
}
