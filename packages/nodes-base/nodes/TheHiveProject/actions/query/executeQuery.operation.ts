import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError, jsonParse } from 'n8n-workflow';

import { updateDisplayOptions, wrapData } from '@utils/utilities';
import { theHiveApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName: 'Query JSON',
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

	const executionData = this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});

	return executionData;
}
