import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { getResolvables, updateDisplayOptions } from '@utils/utilities';

import type { QueryRunner, QueryWithValues } from '../../helpers/interfaces';
import { prepareQueryAndReplacements, replaceEmptyStringsByNulls } from '../../helpers/utils';
import { optionsCollection } from '../common.descriptions';

const properties: INodeProperties[] = [
	{
		displayName: 'Query',
		name: 'query',
		type: 'string',
		default: '',
		placeholder: 'e.g. SELECT id, name FROM product WHERE id < 40',
		required: true,
		description:
			"The SQL query to execute. You can use n8n expressions and $1, $2, $3, etc to refer to the 'Query Parameters' set in options below.",
		noDataExpression: true,
		typeOptions: {
			editor: 'sqlEditor',
			sqlDialect: 'MySQL',
		},
		hint: 'Consider using query parameters to prevent SQL injection attacks. Add them in the options below',
	},
	optionsCollection,
];

const displayOptions = {
	show: {
		resource: ['database'],
		operation: ['executeQuery'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	inputItems: INodeExecutionData[],
	runQueries: QueryRunner,
	nodeOptions: IDataObject,
): Promise<INodeExecutionData[]> {
	const items = replaceEmptyStringsByNulls(inputItems, nodeOptions.replaceEmptyStrings as boolean);

	const errorItems: INodeExecutionData[] = [];
	const queries: QueryWithValues[] = [];
	// Track which original item index each query corresponds to.
	// runQueries uses the query array index for pairedItem, so we need this
	// to remap results back to the correct input items when some items are
	// filtered out due to preparation errors.
	const queryToItemIndex: number[] = [];

	for (let i = 0; i < items.length; i++) {
		try {
			let rawQuery = this.getNodeParameter('query', i) as string;

			for (const resolvable of getResolvables(rawQuery)) {
				rawQuery = rawQuery.replace(resolvable, this.evaluateExpression(resolvable, i) as string);
			}

			const options = this.getNodeParameter('options', i, {});

			const nodeVersion = Number(nodeOptions.nodeVersion);

			let values;
			let queryReplacement = options.queryReplacement || [];

			if (typeof queryReplacement === 'string') {
				queryReplacement = queryReplacement.split(',').map((entry) => entry.trim());
			}

			if (Array.isArray(queryReplacement)) {
				values = queryReplacement as IDataObject[];
			} else {
				throw new NodeOperationError(
					this.getNode(),
					'Query Replacement must be a string of comma-separated values, or an array of values',
					{ itemIndex: i },
				);
			}

			const preparedQuery = prepareQueryAndReplacements(rawQuery, nodeVersion, values);

			if ((nodeOptions.nodeVersion as number) >= 2.3) {
				const parsedNumbers = preparedQuery.values.map((value) => {
					return Number(value) ? Number(value) : value;
				});
				preparedQuery.values = parsedNumbers;
			}

			queries.push(preparedQuery);
			queryToItemIndex.push(i);
		} catch (error) {
			const nodeError =
				error instanceof NodeOperationError
					? error
					: new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
			if (!this.continueOnFail()) {
				throw nodeError;
			}
			errorItems.push({
				json: { message: nodeError.message, error: { ...nodeError } },
				pairedItem: { item: i },
			});
		}
	}

	if (queries.length === 0) {
		return errorItems;
	}

	const queryResults = await runQueries(queries);

	// runQueries assigns pairedItem using query array indices (0..n-1). When
	// some items fail during preparation and are excluded from `queries`, those
	// indices no longer match original input item indices. Remap both object and
	// array pairedItem references back to original indices.
	const remappedResults = queryResults.map((result) => {
		const pairedItem = result.pairedItem;
		if (pairedItem === undefined) {
			return result;
		}

		if (Array.isArray(pairedItem)) {
			const remappedPairedItems = pairedItem.map((entry) => {
				const originalIndex = queryToItemIndex[entry.item];
				if (originalIndex === undefined) {
					return entry;
				}

				return { ...entry, item: originalIndex };
			});

			return { ...result, pairedItem: remappedPairedItems };
		}

		if (
			typeof pairedItem === 'object' &&
			pairedItem.item !== undefined
		) {
			const originalIndex = queryToItemIndex[pairedItem.item];
			if (originalIndex !== undefined) {
				return { ...result, pairedItem: { ...pairedItem, item: originalIndex } };
			}
		}

		return result;
	});

	return [...errorItems, ...remappedResults];
}
