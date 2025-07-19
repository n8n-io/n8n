import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { getResolvables, updateDisplayOptions } from '@utils/utilities';

import type {
	PgpDatabase,
	PostgresNodeOptions,
	QueriesRunner,
	QueryWithValues,
} from '../../helpers/interfaces';
import {
	evaluateExpression,
	isJSON,
	replaceEmptyStringsByNulls,
	stringToArray,
} from '../../helpers/utils';
import { optionsCollection } from '../common.descriptions';

const properties: INodeProperties[] = [
	{
		displayName: 'Query',
		name: 'query',
		type: 'string',
		default: '',
		placeholder: 'e.g. SELECT id, name FROM product WHERE quantity > $1 AND price <= $2',
		noDataExpression: true,
		required: true,
		description:
			"The SQL query to execute. You can use n8n expressions and $1, $2, $3, etc to refer to the 'Query Parameters' set in options below.",
		typeOptions: {
			editor: 'sqlEditor',
			sqlDialect: 'PostgreSQL',
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
	runQueries: QueriesRunner,
	items: INodeExecutionData[],
	nodeOptions: PostgresNodeOptions,
	_db?: PgpDatabase,
): Promise<INodeExecutionData[]> {
	const queries: QueryWithValues[] = replaceEmptyStringsByNulls(
		items,
		nodeOptions.replaceEmptyStrings as boolean,
	).map((_, index) => {
		let query = this.getNodeParameter('query', index) as string;

		for (const resolvable of getResolvables(query)) {
			query = query.replace(resolvable, this.evaluateExpression(resolvable, index) as string);
		}

		let values: Array<IDataObject | string> = [];

		let queryReplacement = this.getNodeParameter('options.queryReplacement', index, '');

		if (typeof queryReplacement === 'number') {
			queryReplacement = String(queryReplacement);
		}

		if (typeof queryReplacement === 'string') {
			const node = this.getNode();

			const rawReplacements = (node.parameters.options as IDataObject)?.queryReplacement as string;

			if (rawReplacements) {
				const nodeVersion = nodeOptions.nodeVersion as number;

				if (nodeVersion >= 2.5) {
					const rawValues = rawReplacements.replace(/^=+/, '');
					const resolvables = getResolvables(rawValues);
					if (resolvables.length) {
						for (const resolvable of resolvables) {
							const evaluatedExpression = evaluateExpression(
								this.evaluateExpression(`${resolvable}`, index),
							);
							// Ensure each resolvable contributes exactly one value
							if (Array.isArray(evaluatedExpression) && evaluatedExpression.length > 0) {
								values.push(evaluatedExpression[0]); // Take the first value to match parameter count
							} else if (typeof evaluatedExpression === 'string') {
								values.push(evaluatedExpression);
							} else {
								values.push(evaluatedExpression);
							}
						}
					} else {
						values.push(...stringToArray(rawValues));
					}
				} else {
					const evaluatedValue = evaluateExpression(this.evaluateExpression(rawValues, index));
					if (Array.isArray(evaluatedValue) && evaluatedValue.length > 0) {
						values.push(evaluatedValue[0]); // Take the first value
					} else if (typeof evaluatedValue === 'string') {
						values.push(evaluatedValue);
					} else if (typeof evaluatedValue === 'number') {
						values.push(evaluatedValue);
					} else {
						throw new NodeOperationError(
							this.getNode(),
							'Query Parameters must be a string, number or array',
							{ itemIndex: index },
						);
					}
				}
			}
		} else {
			if (Array.isArray(queryReplacement)) {
				values = queryReplacement as IDataObject[];
			} else {
				throw new NodeOperationError(
					this.getNode(),
					'Query Parameters must be a string of comma-separated values or an array of values',
					{ itemIndex: index },
				);
			}
		}

		if (!queryReplacement || nodeOptions.treatQueryParametersInSingleQuotesAsText) {
			let nextValueIndex = values.length + 1;
			const literals = query.match(/'\$[0-9]+'/g) ?? [];
			for (const literal of literals) {
				query = query.replace(literal, `$${nextValueIndex}`);
				values.push(literal.replace(/'/g, ''));
				nextValueIndex++;
			}
		}

		return { query, values, options: { partial: true } };
	});

	return await runQueries(queries, items, nodeOptions);
}
