import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { ISSUE_FIELDS, PRIORITY_OPTIONS } from '../../../shared/constants';
import { linearApiRequest } from '../../../shared/GenericFunctions';
import { updateDisplayOptions } from '../../../../../utils/utilities';

const properties: INodeProperties[] = [
	{
		displayName: 'Issue ID',
		name: 'issueId',
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
				displayName: 'Assignee Name or ID',
				name: 'assigneeId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: { loadOptionsMethod: 'getUsers' },
				default: '',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				typeOptions: { rows: 4 },
				default: '',
			},
			{
				displayName: 'Due Date',
				name: 'dueDate',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Label Names or IDs',
				name: 'labelIds',
				type: 'multiOptions',
				description:
					'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: { loadOptionsMethod: 'getLabels' },
				default: [],
			},
			{
				displayName: 'Priority',
				name: 'priority',
				type: 'options',
				options: PRIORITY_OPTIONS,
				default: 0,
			},
			{
				displayName: 'State Name or ID',
				name: 'stateId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: { loadOptionsMethod: 'getStates' },
				default: '',
			},
			{
				displayName: 'Team Name or ID',
				name: 'teamId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: { loadOptionsMethod: 'getTeams' },
				default: '',
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['issue'],
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
		const issueId = this.getNodeParameter('issueId', i) as string;
		const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

		try {
			const body = {
				query: `mutation IssueUpdate(
					$issueId: String!,
					$title: String,
					$teamId: String,
					$description: String,
					$assigneeId: String,
					$priority: Int,
					$stateId: String,
					$dueDate: TimelessDate,
					$labelIds: [String!]
				) {
					issueUpdate(id: $issueId, input: {
						title: $title
						teamId: $teamId
						description: $description
						assigneeId: $assigneeId
						priority: $priority
						stateId: $stateId
						dueDate: $dueDate
						labelIds: $labelIds
					}) {
						success
						issue {
							${ISSUE_FIELDS}
						}
					}
				}`,
				variables: {
					issueId,
					...updateFields,
				},
			};

			const responseData = await linearApiRequest.call(this, body);
			const issue = (responseData as { data: { issueUpdate: { issue: IDataObject } } }).data
				.issueUpdate?.issue;

			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(issue),
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
