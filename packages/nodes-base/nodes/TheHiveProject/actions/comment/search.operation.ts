import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { updateDisplayOptions, wrapData } from '@utils/utilities';

import {
	alertRLC,
	caseRLC,
	genericFiltersCollection,
	returnAllAndLimit,
	searchOptions,
	sortCollection,
} from '../../descriptions';
import type { QueryScope } from '../../helpers/interfaces';
import { theHiveApiQuery } from '../../transport';

const properties: INodeProperties[] = [
	{
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
		displayName: 'Search in',
		name: 'searchIn',
		type: 'options',
		default: 'all',
		description:
			'Whether to search for comments in all alerts and cases or in a specific case or alert',
		options: [
			{
				name: 'Alerts and Cases',
				value: 'all',
			},
			{
				name: 'Alert',
				value: 'alert',
			},
			{
				name: 'Case',
				value: 'case',
			},
		],
	},
	{
		...caseRLC,
		displayOptions: {
			show: {
				searchIn: ['case'],
			},
		},
	},
	{
		...alertRLC,
		displayOptions: {
			show: {
				searchIn: ['alert'],
			},
		},
	},
	...returnAllAndLimit,
	genericFiltersCollection,
	sortCollection,
	searchOptions,
];

const displayOptions = {
	show: {
		resource: ['comment'],
		operation: ['search'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	let responseData: IDataObject | IDataObject[] = [];

	const searchIn = this.getNodeParameter('searchIn', i) as string;
	const filtersValues = this.getNodeParameter('filters.values', i, []) as IDataObject[];
	const sortFields = this.getNodeParameter('sort.fields', i, []) as IDataObject[];
	const returnAll = this.getNodeParameter('returnAll', i);
	const { returnCount, extraData } = this.getNodeParameter('options', i);

	let limit;
	let scope: QueryScope;

	if (searchIn === 'all') {
		scope = { query: 'listComment' };
	} else if (searchIn === 'alert') {
		const alertId = this.getNodeParameter('alertId', i, '', { extractValue: true }) as string;
		scope = { query: 'getAlert', id: alertId, restrictTo: 'comments' };
	} else if (searchIn === 'case') {
		const caseId = this.getNodeParameter('caseId', i, '', { extractValue: true }) as string;
		scope = { query: 'getCase', id: caseId, restrictTo: 'comments' };
	} else {
		throw new NodeOperationError(this.getNode(), `Invalid 'Search In ...' value: ${searchIn}`);
	}

	if (!returnAll) {
		limit = this.getNodeParameter('limit', i);
	}

	responseData = await theHiveApiQuery.call(
		this,
		scope,
		filtersValues,
		sortFields,
		limit,
		returnCount as boolean,
		extraData as string[],
	);

	const executionData = this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});

	return executionData;
}
