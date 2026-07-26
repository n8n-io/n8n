import { Container } from '@n8n/di';
import { ErrorReporter } from 'n8n-core';

import type {
	IDataObject,
	IExecuteFunctions,
	INode,
	INodeExecutionData,
	INodeProperties,
	IPairedItemData,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { getResolvables, updateDisplayOptions } from '@utils/utilities';

import { numberInputsProperty } from '../../helpers/descriptions';
import { modifySelectQuery, rowToExecutionData } from '../../helpers/utils';
import {
	isSandboxMemoryError,
	resetSandboxCache,
	runAlaSqlInSandbox,
} from '../../helpers/sandbox-utils';

type OperationOptions = {
	emptyQueryResult?: 'success' | 'empty';
	queryParameters?: string | number | unknown[];
};

type QueryParameterValue = string | number | boolean | null;

export const properties: INodeProperties[] = [
	numberInputsProperty,
	{
		displayName: 'Query',
		name: 'query',
		type: 'string',
		default: 'SELECT * FROM input1 LEFT JOIN input2 ON input1.name = input2.id',
		noDataExpression: true,
		description: 'Input data available as tables with corresponding number, e.g. input1, input2',
		hint: 'Supports <a href="https://github.com/alasql/alasql/wiki/Supported-SQL-statements" target="_blank">most</a> of the SQL-99 language',
		required: true,
		typeOptions: {
			rows: 5,
			editor: 'sqlEditor',
		},
	},
	{
		displayName:
			'Use query parameters for dynamic values. Expressions in the query text become part of the SQL. Add values in <b>Options > Query Parameters</b> and reference them with <code>?</code> placeholders.',
		name: 'queryParametersNotice',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		options: [
			{
				displayName: 'Empty Query Result',
				name: 'emptyQueryResult',
				type: 'options',
				description: 'What to return if the query executed successfully but returned no results',
				options: [
					{
						name: 'Success',
						value: 'success',
					},
					{
						name: 'Empty Result',
						value: 'empty',
					},
				],
				default: 'empty',
				displayOptions: {
					show: {
						'@version': [3.2],
					},
				},
			},
			{
				displayName: 'Query Parameters',
				name: 'queryParameters',
				type: 'string',
				default: '',
				placeholder: 'value1,value2,value3',
				description:
					'Comma-separated list of values to use as query parameters. Reference them in the query with ? placeholders. <a href="https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.merge/#use-query-parameters" target="_blank">More info</a>.',
				hint: 'Reference query parameters with ? placeholders',
			},
		],
	},
];

const displayOptions = {
	show: {
		mode: ['combineBySql'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

const prepareError = (node: INode, error: Error) => {
	const raw = typeof error === 'string' ? error : error.message;
	const isDisposed = isSandboxMemoryError(error);
	const isTimeout = /script execution timed out/i.test(raw);

	if (isDisposed) resetSandboxCache();

	const message = isDisposed
		? 'Dataset too large for the SQL sandbox'
		: isTimeout
			? 'SQL query exceeded the 30 second execution limit'
			: 'Issue while executing query';
	const description = isDisposed
		? 'Try filtering or aggregating upstream, or split the input into smaller batches before the Merge node.'
		: isTimeout
			? 'Simplify the query (remove unnecessary JOINs) or reduce the number of input rows.'
			: raw;

	throw new NodeOperationError(node, error, { message, description, itemIndex: 0 });
};

function parseQueryParameterValue(value: string): string | number {
	const numberValue = Number(value);

	return value !== '' && !Number.isNaN(numberValue) ? numberValue : value;
}

function validateQueryParameterValue(
	node: INode,
	value: unknown,
	index: number,
): QueryParameterValue {
	if (
		value === null ||
		typeof value === 'string' ||
		typeof value === 'number' ||
		typeof value === 'boolean'
	) {
		return value;
	}

	throw new NodeOperationError(
		node,
		`Query parameter ${index + 1} must be a string, number, boolean, or null`,
		{ itemIndex: 0 },
	);
}

function getQueryParameterValues(
	node: INode,
	queryParameters: OperationOptions['queryParameters'],
): QueryParameterValue[] {
	if (queryParameters === undefined || queryParameters === '') return [];
	if (Array.isArray(queryParameters)) {
		return queryParameters.map((value, index) => validateQueryParameterValue(node, value, index));
	}
	if (typeof queryParameters === 'number') return [queryParameters];
	if (typeof queryParameters !== 'string') {
		throw new NodeOperationError(node, 'Query parameters must be a string, number, or array', {
			itemIndex: 0,
		});
	}

	return queryParameters.split(',').map((entry) => parseQueryParameterValue(entry.trim()));
}

async function executeSelectWithMappedPairedItems(
	node: INode,
	inputsData: INodeExecutionData[][],
	query: string,
	parameters: unknown[],
	returnSuccessItemIfEmpty: boolean,
): Promise<INodeExecutionData[][]> {
	const returnData: INodeExecutionData[] = [];

	const tableData = inputsData.map((inputData) =>
		inputData.map((entry) => ({ ...entry.json, pairedItem: entry.pairedItem })),
	);

	try {
		const result = await runAlaSqlInSandbox(
			tableData,
			modifySelectQuery(query, inputsData.length),
			parameters,
		);

		for (const item of result) {
			if (Array.isArray(item)) {
				returnData.push.apply(returnData, item.map(rowToExecutionData));
			} else if (typeof item === 'object') {
				returnData.push(rowToExecutionData(item));
			}
		}

		if (!returnData.length && returnSuccessItemIfEmpty) {
			returnData.push({ json: { success: true } });
		}
	} catch (error) {
		prepareError(node, error as Error);
	}

	return [returnData];
}

export async function execute(
	this: IExecuteFunctions,
	inputsData: INodeExecutionData[][],
): Promise<INodeExecutionData[][]> {
	const node = this.getNode();
	const returnData: INodeExecutionData[] = [];
	const pairedItem: IPairedItemData[] = [];
	const options = this.getNodeParameter('options', 0, {}) as OperationOptions;
	const workflowId = this.getWorkflow().id;

	let query = this.getNodeParameter('query', 0) as string;

	for (const resolvable of getResolvables(query)) {
		query = query.replace(resolvable, this.evaluateExpression(resolvable, 0) as string);
	}

	// the value is resolved once, not on each execution, because merge mode runs once for all items
	const parameters = getQueryParameterValues(node, options.queryParameters);

	const isSelectQuery = node.typeVersion >= 3.1 ? query.toLowerCase().startsWith('select') : false;
	const returnSuccessItemIfEmpty =
		node.typeVersion <= 3.1 ? true : options.emptyQueryResult === 'success';

	if (isSelectQuery) {
		try {
			return await executeSelectWithMappedPairedItems(
				node,
				inputsData,
				query,
				parameters,
				returnSuccessItemIfEmpty,
			);
		} catch (error) {
			Container.get(ErrorReporter).error(error, {
				extra: {
					nodeName: node.name,
					nodeType: node.type,
					nodeVersion: node.typeVersion,
					workflowId,
				},
			});
		}
	}

	for (let i = 0; i < inputsData.length; i++) {
		const inputData = inputsData[i];

		inputData.forEach((item, index) => {
			if (item.pairedItem === undefined) {
				item.pairedItem = index;
			}

			if (typeof item.pairedItem === 'number') {
				pairedItem.push({
					item: item.pairedItem,
					input: i,
				});
				return;
			}

			if (Array.isArray(item.pairedItem)) {
				const pairedItems = item.pairedItem
					.filter((p) => p !== undefined)
					.map((p) => (typeof p === 'number' ? { item: p } : p))
					.map((p) => {
						return {
							item: p.item,
							input: i,
						};
					});
				pairedItem.push.apply(pairedItem, pairedItems);
				return;
			}

			pairedItem.push({
				item: item.pairedItem.item,
				input: i,
			});
		});
	}

	const tableData: IDataObject[][] = inputsData.map((inputData) =>
		inputData.map((entry) => entry.json),
	);

	try {
		const result = await runAlaSqlInSandbox(tableData, query, parameters);

		for (const item of result) {
			if (Array.isArray(item)) {
				returnData.push.apply(
					returnData,
					item.map((json) => ({ json, pairedItem })),
				);
			} else if (typeof item === 'object') {
				returnData.push({ json: item, pairedItem });
			}
		}

		if (!returnData.length && returnSuccessItemIfEmpty) {
			returnData.push({ json: { success: true }, pairedItem });
		}
	} catch (error) {
		prepareError(node, error as Error);
	}

	return [returnData];
}
