import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../utils/utilities';
import { pipedriveApiRequest } from '../../transport';
import { parseSearchResponse } from '../../helpers';

const properties: INodeProperties[] = [
	{
		displayName: 'Term',
		name: 'term',
		type: 'string',
		required: true,
		default: '',
		description: 'The search term to look for. Minimum 2 characters (or 1 if using exact_match).',
	},
	{
		displayName: 'Exact Match',
		name: 'exactMatch',
		type: 'boolean',
		default: false,
		description:
			'Whether only full exact matches against the given term are returned. It is not case sensitive.',
	},
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
		displayOptions: {
			show: {
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 100,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		options: [
			{
				displayName: 'Include Fields',
				name: 'includeFields',
				type: 'string',
				default: '',
				description:
					'Supports including optional fields in the results which are not provided by default. Example: lead.was_seen.',
			},
			{
				displayName: 'Organization ID',
				name: 'organizationId',
				type: 'string',
				default: '',
				description: 'Will filter Leads by the provided Organization ID',
			},
			{
				displayName: 'Person ID',
				name: 'personId',
				type: 'string',
				default: '',
				description: 'Will filter Leads by the provided Person ID',
			},
			{
				displayName: 'Search Fields',
				name: 'fields',
				type: 'multiOptions',
				options: [
					{
						name: 'Custom Fields',
						value: 'custom_fields',
					},
					{
						name: 'Notes',
						value: 'notes',
					},
					{
						name: 'Title',
						value: 'title',
					},
				],
				default: ['custom_fields', 'notes', 'title'],
				description:
					'A comma-separated string array. The fields to perform the search from. Defaults to all of them.',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['lead'],
		operation: ['search'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		try {
			const qs: IDataObject = {};

			qs.term = this.getNodeParameter('term', i) as string;
			qs.exact_match = this.getNodeParameter('exactMatch', i) as boolean;

			const returnAll = this.getNodeParameter('returnAll', i) as boolean;
			if (!returnAll) {
				qs.limit = this.getNodeParameter('limit', i) as number;
			}

			const additionalFields = this.getNodeParameter('additionalFields', i);

			// No selected field means all fields, so an empty list adds no parameter.
			if ((additionalFields.fields as string[] | undefined)?.length) {
				qs.fields = (additionalFields.fields as string[]).join(',');
			}

			// Only whole positive numbers are IDs. parseInt would turn "7abc" into 7.
			const toId = (name: string, input: unknown) => {
				const value = String(input).trim();
				const id = Number(value);
				if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(id)) {
					throw new NodeOperationError(this.getNode(), `${name} "${input}" is not a valid ID`, {
						itemIndex: i,
					});
				}
				return id;
			};

			if (additionalFields.organizationId) {
				qs.organization_id = toId('Organization ID', additionalFields.organizationId);
			}

			if (additionalFields.includeFields) {
				qs.include_fields = additionalFields.includeFields as string;
			}

			if (additionalFields.personId) {
				qs.person_id = toId('Person ID', additionalFields.personId);
			}

			// The lead search exists only in the v2 API. It pages with a cursor and returns
			// at most 100 items for each page.
			qs.limit = returnAll ? 100 : qs.limit;
			const results: IDataObject[] = [];
			const seenCursors = new Set<string>();
			let morePages = true;
			while (morePages) {
				const page = await pipedriveApiRequest.call(this, 'GET', '/leads/search', {}, qs);
				const pageItems = ((page.data as IDataObject)?.items as IDataObject[]) ?? [];
				results.push(...pageItems);
				const nextCursor = page.additionalData?.next_cursor as string | undefined;
				// Stop on the last page, and also when a page brings no progress or a cursor
				// comes back, so a cursor cycle cannot loop forever.
				morePages =
					returnAll && !!nextCursor && pageItems.length > 0 && !seenCursors.has(nextCursor);
				if (nextCursor) seenCursors.add(nextCursor);
				qs.cursor = nextCursor;
			}
			const responseData = { data: { items: results } };

			const data = parseSearchResponse(responseData);

			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(data),
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
