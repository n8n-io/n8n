import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { ISSUE_FIELDS, PRIORITY_OPTIONS } from '../../../shared/constants';
import { linearApiRequestAllItems } from '../../../shared/GenericFunctions';
import { updateDisplayOptions } from '../../../../../utils/utilities';

const properties: INodeProperties[] = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		typeOptions: { minValue: 1 },
		displayOptions: {
			show: { returnAll: [false] },
		},
		description: 'Max number of results to return',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
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
		],
	},
];

const displayOptions = {
	show: {
		resource: ['issue'],
		operation: ['getAll'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	_items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];

	const returnAll = this.getNodeParameter('returnAll', 0) as boolean;
	const filters = this.getNodeParameter('filters', 0) as IDataObject;
	const limit = returnAll ? undefined : (this.getNodeParameter('limit', 0) as number);

	// Build filter object for the query
	const filter: IDataObject = {};
	if (filters.assigneeId) filter.assignee = { id: { eq: filters.assigneeId } };
	if (filters.priority !== undefined && filters.priority !== '') {
		filter.priority = { eq: filters.priority };
	}
	if (filters.stateId) filter.state = { id: { eq: filters.stateId } };
	if (filters.teamId) filter.team = { id: { eq: filters.teamId } };

	const body = {
		query: `query Issues($first: Int, $after: String, $filter: IssueFilter) {
			issues(first: $first, after: $after, filter: $filter) {
				nodes {
					${ISSUE_FIELDS}
				}
				pageInfo {
					hasNextPage
					endCursor
				}
			}
		}`,
		variables: {
			first: 50,
			...(Object.keys(filter).length > 0 ? { filter } : {}),
		},
	};

	try {
		const issues = await linearApiRequestAllItems.call(this, 'data.issues', body, limit);

		const executionData = this.helpers.constructExecutionMetaData(
			this.helpers.returnJsonArray(issues),
			{ itemData: { item: 0 } },
		);
		returnData.push(...executionData);
	} catch (error) {
		if (this.continueOnFail()) {
			returnData.push(
				...this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray({ error: (error as Error).message }),
					{ itemData: { item: 0 } },
				),
			);
		} else {
			throw error;
		}
	}

	return returnData;
}
