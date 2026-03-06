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
		displayName: 'Team Names or IDs',
		name: 'teamIds',
		type: 'multiOptions',
		required: true,
		description:
			'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		typeOptions: { loadOptionsMethod: 'getTeams' },
		default: [],
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		options: [
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				typeOptions: { rows: 4 },
				default: '',
			},
			{
				displayName: 'Lead Name or ID',
				name: 'leadId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: { loadOptionsMethod: 'getUsers' },
				default: '',
			},
			{
				displayName: 'Status',
				name: 'state',
				type: 'options',
				options: [
					{ name: 'Backlog', value: 'backlog' },
					{ name: 'Planned', value: 'planned' },
					{ name: 'In Progress', value: 'inProgress' },
					{ name: 'Paused', value: 'paused' },
					{ name: 'Completed', value: 'completed' },
					{ name: 'Cancelled', value: 'cancelled' },
				],
				default: 'planned',
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
		resource: ['project'],
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
			const teamIds = this.getNodeParameter('teamIds', i) as string[];
			const additionalFields = this.getNodeParameter('additionalFields', i) as Record<
				string,
				unknown
			>;

			const body = {
				query: `mutation ProjectCreate(
					$name: String!,
					$teamIds: [String!]!,
					$description: String,
					$leadId: String,
					$state: String,
					$targetDate: TimelessDate
				) {
					projectCreate(input: {
						name: $name
						teamIds: $teamIds
						description: $description
						leadId: $leadId
						state: $state
						targetDate: $targetDate
					}) {
						success
						project {
							id
							name
							description
							state
							createdAt
							updatedAt
							targetDate
							lead {
								id
								displayName
							}
						}
					}
				}`,
				variables: {
					name,
					teamIds,
					...additionalFields,
				},
			};

			const responseData = await linearApiRequest.call(this, body);
			const project = (responseData as { data: { projectCreate: { project: IDataObject } } }).data
				.projectCreate?.project;

			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(project),
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
