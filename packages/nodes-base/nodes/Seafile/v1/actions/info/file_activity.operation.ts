import {
	type IDataObject,
	type INodeExecutionData,
	type INodeProperties,
	type IExecuteFunctions,
	IRequestOptions,
} from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';
import { parseToTimestamp } from '../../GenericFunctions';

export const properties: INodeProperties[] = [
	{
		displayName:
			'This returns events of all libraries. The filters are used to limit the number of returned events after loading.',
		name: 'notice',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'Page',
		name: 'page',
		type: 'number',
		default: 1,
		typeOptions: {
			minValue: 1,
			numberStepSize: 1,
			numberPrecision: 0,
		},
		description: 'Page to load',
	},
	{
		displayName: 'Per Page',
		name: 'per_page',
		type: 'number',
		default: 100,
		typeOptions: {
			minValue: 1,
			numberStepSize: 1,
			numberPrecision: 0,
		},
		description: 'Events to load per page',
	},
	{
		displayName: 'Search Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		options: [
			{
				displayName: 'Library Name or ID',
				name: 'repo',
				type: 'options',
				placeholder: 'Select a Library',
				typeOptions: {
					loadOptionsMethod: 'getRepos',
				},
				default: '',
				description:
					'The name of SeaTable library to access. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Event Time After',
				name: 'time_from',
				type: 'dateTime',
				default: '',
				description:
					'Returns events that happened after this date. Supported inputs are date (ISO format like 2024-08-25T15:34:47 or timestamps with 13 digits.',
				hint: 'Choose a date or use an expression like {{ $now - (2*24*60*60*1000) }} to get only events of the last two days.',
			},
			{
				displayName: 'Event Time Before',
				name: 'time_to',
				type: 'dateTime',
				default: '',
				description:
					'Return events that happened before this date. Supported inputs are date (ISO format like 2024-08-25T15:34:47 or timestamps with 13 digits.',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['info'],
		operation: ['file_activity'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const credentials = await this.getCredentials('seafileApi');
	const baseURL = credentials?.domain;

	// get parameters
	const filters = this.getNodeParameter('filters', index);
	const per_page = this.getNodeParameter('per_page', index);
	const page = this.getNodeParameter('page', index);

	const options: IRequestOptions = {
		method: 'GET',
		qs: {
			page: page,
			per_page: per_page,
		},
		body: {},
		uri: `${baseURL}/api/v2.1/activities/` as string,
		json: true,
	};

	const responseData = await this.helpers.requestWithAuthentication.call(
		this,
		'seafileApi',
		options,
	);

	let output = responseData.events;
	// limit to a repo if requested
	if (filters.repo) output = output.filter((e: any) => e.repo_id === filters.repo);
	// limit by time if requested
	if (filters.time_from)
		output = output.filter(
			(e: any) => parseToTimestamp(e.time) > parseToTimestamp(filters.time_from as any),
		);
	if (filters.time_to)
		output = output.filter(
			(e: any) => parseToTimestamp(e.time) > parseToTimestamp(filters.time_from as any),
		);

	return this.helpers.returnJsonArray(output as IDataObject[]);
}
