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
		displayName: 'Project ID',
		name: 'projectId',
		type: 'string',
		required: true,
		default: '',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
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
				displayName: 'Name',
				name: 'name',
				type: 'string',
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
			const projectId = this.getNodeParameter('projectId', i) as string;
			const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

			const body = {
				query: `mutation ProjectUpdate(
					$projectId: String!,
					$name: String,
					$description: String,
					$leadId: String,
					$state: String,
					$targetDate: TimelessDate
				) {
					projectUpdate(id: $projectId, input: {
						name: $name
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
						}
					}
				}`,
				variables: {
					projectId,
					...updateFields,
				},
			};

			const responseData = await linearApiRequest.call(this, body);
			const project = (responseData as { data: { projectUpdate: { project: IDataObject } } }).data
				.projectUpdate?.project;

			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(project as IDataObject),
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
