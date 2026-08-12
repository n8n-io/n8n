import type {
	IDisplayOptions,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	ListProjectFilesOptions,
} from 'n8n-workflow';

import { getProjectFilesProxy } from '../../common/utils';

export const FIELD = 'getMany';

const FILES_LIMIT_DEFAULT = 50;

const displayOptions: IDisplayOptions = {
	show: {
		resource: ['file'],
		operation: [FIELD],
	},
};

export const description: INodeProperties[] = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: true,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions,
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: FILES_LIMIT_DEFAULT,
		description: 'Max number of results to return',
		typeOptions: {
			minValue: 1,
		},
		displayOptions: {
			show: {
				...displayOptions.show,
				returnAll: [false],
			},
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions,
		options: [
			{
				displayName: 'Filter by Name',
				name: 'filterName',
				type: 'string',
				default: '',
				description: 'Only return files whose name contains this text (case-insensitive)',
			},
			{
				displayName: 'Sort Field',
				name: 'sortField',
				type: 'options',
				default: 'updatedAt',
				options: [
					{ name: 'Name', value: 'name' },
					{ name: 'Size', value: 'sizeBytes' },
					{ name: 'Updated', value: 'updatedAt' },
				],
			},
			{
				displayName: 'Sort Order',
				name: 'sortOrder',
				type: 'options',
				default: 'desc',
				options: [
					{ name: 'Ascending', value: 'asc' },
					{ name: 'Descending', value: 'desc' },
				],
			},
		],
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const proxy = await getProjectFilesProxy(this);
	const returnAll = this.getNodeParameter('returnAll', index, true);
	const limit = this.getNodeParameter('limit', index, FILES_LIMIT_DEFAULT);
	const options = this.getNodeParameter('options', index, {}) as {
		filterName?: string;
		sortField?: 'name' | 'sizeBytes' | 'updatedAt';
		sortOrder?: 'asc' | 'desc';
	};

	const listOptions: ListProjectFilesOptions = {
		sortBy: `${options.sortField ?? 'updatedAt'}:${options.sortOrder ?? 'desc'}`,
	};
	if (options.filterName) listOptions.filter = { name: options.filterName };
	if (!returnAll) listOptions.take = limit;

	// Metadata only, no bytes — compose with Download for bulk reads.
	const { data } = await proxy.getManyAndCount(listOptions);

	return data.map((file) => ({
		json: {
			id: file.id,
			name: file.name,
			mimeType: file.mimeType,
			sizeBytes: file.sizeBytes,
			createdAt: file.createdAt,
			updatedAt: file.updatedAt,
		},
		pairedItem: { item: index },
	}));
}
