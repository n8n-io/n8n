import { jsonParse, NodeOperationError } from 'n8n-workflow';
import type { INode } from 'n8n-workflow';

type QueryParameterScalar = string | number | boolean | bigint | Date | null;
type QueryParameter = QueryParameterScalar | QueryParameterScalar[];

export function isScalarValue(value: unknown): value is QueryParameterScalar {
	return (
		value === null ||
		typeof value === 'string' ||
		typeof value === 'number' ||
		typeof value === 'boolean' ||
		typeof value === 'bigint' ||
		value instanceof Date
	);
}

function parseQueryParameters(
	rawParameters: unknown,
	node: INode,
	itemIndex: number,
): QueryParameter[] {
	let parameters: unknown = rawParameters;

	if (typeof parameters === 'string') {
		try {
			parameters = JSON.parse(parameters) as unknown;
		} catch (error) {
			throw new NodeOperationError(node, error as Error, {
				itemIndex,
				message: 'Query Parameters must be valid JSON',
				description: 'Enter the parameters as a JSON array',
			});
		}
	}

	if (!Array.isArray(parameters)) {
		throw new NodeOperationError(node, 'Query Parameters must be a JSON array', {
			itemIndex,
			description: 'Enter the parameters as a JSON array',
		});
	}

	return parameters.map((parameter, index) => {
		if (isScalarValue(parameter) || (Array.isArray(parameter) && parameter.every(isScalarValue))) {
			return parameter;
		}

		throw new NodeOperationError(
			node,
			`Query parameter ${index + 1} must be a scalar or an array of scalars`,
			{
				itemIndex,
				description: 'Objects and nested arrays are not supported',
			},
		);
	});
}

/**
 * Parses a JSON query and substitutes `$1`, `$2`, ... placeholders with the given parameters.
 *
 * Placeholders are only substituted when they make up a complete string value, so a parameter
 * can never contribute structure (keys, operators, extra clauses) to the resulting query.
 */
export function parseAndResolveQueryParameters(
	query: string,
	rawParameters: unknown,
	node: INode,
	itemIndex: number,
): unknown {
	const parsedQuery = jsonParse<unknown>(query, {
		errorMessage: "Invalid JSON in 'Query'",
	});
	const parameters = parseQueryParameters(rawParameters, node, itemIndex);

	if (parameters.length === 0) return parsedQuery;

	const usedParameters = new Set<number>();

	const resolveValue = (value: unknown): unknown => {
		if (typeof value === 'string') {
			const match = /^\$(\d+)$/.exec(value);
			if (!match) return value;

			const parameterIndex = Number(match[1]) - 1;
			if (parameterIndex < 0 || parameterIndex >= parameters.length) {
				throw new NodeOperationError(node, `Query placeholder ${value} has no matching value`, {
					itemIndex,
					description: `Add a value for ${value} to Query Parameters`,
				});
			}

			usedParameters.add(parameterIndex);
			return parameters[parameterIndex];
		}

		if (Array.isArray(value)) return value.map(resolveValue);

		if (value !== null && typeof value === 'object') {
			return Object.fromEntries(
				Object.entries(value).map(([key, entry]) => [key, resolveValue(entry)]),
			);
		}

		return value;
	};

	const resolvedQuery = resolveValue(parsedQuery);
	const unusedParameter = parameters.findIndex((_, index) => !usedParameters.has(index));

	if (unusedParameter !== -1) {
		throw new NodeOperationError(node, `Query parameter ${unusedParameter + 1} is not used`, {
			itemIndex,
			description: `Add $${unusedParameter + 1} to the query or remove the unused parameter`,
		});
	}

	return resolvedQuery;
}
