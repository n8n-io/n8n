import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError, jsonParse } from 'n8n-workflow';

import { updateDisplayOptions, wrapData } from '@utils/utilities';
import { theHiveApiQuery, theHiveApiRequest } from '../../transport';
import { genericFiltersCollection, sortCollection } from '../common.description';

const properties: INodeProperties[] = [
	{
		displayName: 'Use JSON Input',
		name: 'useJsonInput',
		type: 'boolean',
		default: false,
	},
	{
		displayName: 'Query',
		name: 'queryJson',
		type: 'string',
		required: true,
		default: '[\n  {\n    "_name": "listOrganisation"\n  }\n]',
		description: 'Search for objects with filtering and sorting capabilities',
		hint: 'The query should be an array of operations with required Selection and optional Filtering, Sorting, and Pagination. See <a href="https://docs.strangebee.com/thehive/api-docs/#operation/Query%20API" target="_blank">Query API</a> for more information.',
		typeOptions: {
			editor: 'json',
			rows: 5,
		},
		displayOptions: {
			show: {
				useJsonInput: [true],
			},
		},
	},
	{
		displayName: 'List ...',
		name: 'listResource',
		type: 'options',
		options: [
			{
				name: 'Action',
				value: 'listAction',
			},
			{
				name: 'Alert',
				value: 'listAlert',
			},
			{
				name: 'Alert Status',
				value: 'listAlertStatus',
			},
			{
				name: 'Analyzer Template',
				value: 'listAnalyzerTemplate',
			},
			{
				name: 'Any',
				value: 'listAny',
			},
			{
				name: 'Audit',
				value: 'listAudit',
			},
			{
				name: 'Case',
				value: 'listCase',
			},
			{
				name: 'Case Status',
				value: 'listCaseStatus',
			},
			{
				name: 'Case Task',
				value: 'listCaseTask',
			},
			{
				name: 'Case Template',
				value: 'listCaseTemplate',
			},
			{
				name: 'Catalog',
				value: 'listCatalog',
			},
			{
				name: 'Custom Field',
				value: 'listCustomField',
			},
			{
				name: 'Dashboard',
				value: 'listDashboard',
			},
			{
				name: 'Function',
				value: 'listFunction',
			},
			{
				name: 'Job',
				value: 'listJob',
			},
			{
				name: 'Log',
				value: 'listLog',
			},
			{
				name: 'Observable',
				value: 'listObservable',
			},
			{
				name: 'Observable Type',
				value: 'listObservableType',
			},
			{
				name: 'Organisation',
				value: 'listOrganisation',
			},
			{
				name: 'Organisation Page',
				value: 'listOrganisationPage',
			},
			{
				name: 'Page',
				value: 'listPage',
			},
			{
				name: 'Pattern',
				value: 'listPattern',
			},
			{
				name: 'Procedure',
				value: 'listProcedure',
			},
			{
				name: 'Profile',
				value: 'listProfile',
			},
			{
				name: 'Share',
				value: 'listShare',
			},
			{
				name: 'Tag',
				value: 'listTag',
			},
			{
				name: 'Task',
				value: 'listTask',
			},
			{
				name: 'Taxonomy',
				value: 'listTaxonomy',
			},
			{
				name: 'User',
				value: 'listUser',
			},
		],
		default: 'listAlert',
		displayOptions: {
			show: {
				useJsonInput: [false],
			},
		},
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				useJsonInput: [false],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: {
			minValue: 1,
		},
		default: 50,
		description: 'Max number of results to return',
		displayOptions: {
			show: {
				returnAll: [false],
				useJsonInput: [false],
			},
		},
	},
	{
		...genericFiltersCollection,
		displayOptions: {
			show: {
				useJsonInput: [false],
			},
		},
	},
	{
		...sortCollection,
		displayOptions: {
			show: {
				useJsonInput: [false],
			},
		},
	},
];

const displayOptions = {
	show: {
		resource: ['query'],
		operation: ['executeQuery'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	let responseData: IDataObject | IDataObject[] = [];

	const useJsonInput = this.getNodeParameter('useJsonInput', i) as boolean;

	if (useJsonInput) {
		const queryJson = this.getNodeParameter('queryJson', i) as string;

		let query: IDataObject = {};
		if (typeof queryJson === 'object') {
			query = queryJson;
		} else {
			query = jsonParse<IDataObject>(queryJson, {
				errorMessage: 'Query JSON must be a valid JSON object',
			});
		}

		if (query.query) {
			query = query.query as IDataObject;
		}

		if (!Array.isArray(query)) {
			throw new NodeOperationError(
				this.getNode(),
				'The query should be an array of operations with required Selection and optional Filtering, Sorting, and Pagination',
			);
		}

		const body: IDataObject = {
			query,
		};

		responseData = await theHiveApiRequest.call(this, 'POST', '/v1/query', body);
	} else {
		const listResource = this.getNodeParameter('listResource', i) as string;
		const sortFields = this.getNodeParameter('sort.fields', i, []) as IDataObject[];
		const filtersValues = this.getNodeParameter('filters.values', i, []) as IDataObject[];
		const returnAll = this.getNodeParameter('returnAll', i);
		let limit;

		if (!returnAll) {
			limit = this.getNodeParameter('limit', i);
		}

		responseData = await theHiveApiQuery.call(
			this,
			{ query: listResource },
			filtersValues,
			sortFields,
			limit,
		);
	}

	if (typeof responseData !== 'object') {
		responseData = { queryResult: responseData };
	}

	const executionData = this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});

	return executionData;
}
