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
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
	},
	{
		displayName: 'Team Name or ID',
		name: 'teamId',
		type: 'options',
		required: true,
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		typeOptions: { loadOptionsMethod: 'getTeams' },
		default: '',
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
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		try {
			const name = this.getNodeParameter('name', i) as string;
			const teamId = this.getNodeParameter('teamId', i) as string;
			const additionalFields = this.getNodeParameter('additionalFields', i) as Record<
				string,
				unknown
			>;

			const body = {
				query: `mutation IssueLabelCreate($name: String!, $teamId: String!, $color: String, $description: String) {
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
					teamId,
					...additionalFields,
				},
			};

			const responseData = await linearApiRequest.call(this, body);
			const label = (responseData as { data: { issueLabelCreate: { issueLabel: IDataObject } } })
				.data.issueLabelCreate?.issueLabel;

			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(label),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
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
