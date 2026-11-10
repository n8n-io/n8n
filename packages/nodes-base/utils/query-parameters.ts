import { isSafeObjectProperty, jsonParse, NodeOperationError } from 'n8n-workflow';
import type { INode } from 'n8n-workflow';

type QueryParameterScalar = string | number | boolean | bigint | Date | null;
type QueryParameter = QueryParameterScalar | QueryParameterScalar[];

const PLACEHOLDER = /^\$(\d+)$/;

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

export function isScalarMatchValue(value: unknown): value is Exclude<QueryParameterScalar, null> {
	return value !== null && isScalarValue(value);
}

function parseQueryParameters(
	rawParameters: unknown,
	node: INode,
	itemIndex: number,
	label: string,
): QueryParameter[] {
	let parameters: unknown = rawParameters;

	if (typeof parameters === 'string') {
		try {
			parameters = JSON.parse(parameters) as unknown;
		} catch (error) {
			throw new NodeOperationError(node, error as Error, {
				itemIndex,
				message: `${label} Parameters must be valid JSON`,
				description: 'Enter the parameters as a JSON array',
			});
		}
	}

	if (!Array.isArray(parameters)) {
		throw new NodeOperationError(node, `${label} Parameters must be a JSON array`, {
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
			`${label} parameter ${index + 1} must be a scalar or an array of scalars`,
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
 * Placeholders are only substituted when they make up a complete string value or a complete
 * object key, so a parameter can never contribute structure (extra keys, operators, extra
 * clauses) to the resulting query. A parameter bound to a key must be a plain, non-`$` string, so
 * it can neither turn into an operator nor shadow a reserved object property such as `constructor`,
 * and it must not collide with another field name in the same object, so it cannot replace a clause
 * the author wrote.
 *
 */
export function parseAndResolveQueryParameters(
	query: string,
	rawParameters: unknown,
	node: INode,
	itemIndex: number,
	label = 'Query',
	{
		rejectNull = false,
		escapeDollarStrings = false,
		escapeDollarStringsInFields = [],
		preserveDollarStringsInFields = [],
	}: {
		rejectNull?: boolean;
		escapeDollarStrings?: boolean;
		escapeDollarStringsInFields?: string[];
		preserveDollarStringsInFields?: string[];
	} = {},
): unknown {
	const parsedQuery = jsonParse<unknown>(query, {
		errorMessage: `Invalid JSON in '${label}'`,
	});
	const parameters = parseQueryParameters(rawParameters, node, itemIndex, label);

	if (rejectNull) {
		const nullParameter = parameters.findIndex(
			(parameter) => parameter === null || (Array.isArray(parameter) && parameter.includes(null)),
		);

		if (nullParameter !== -1) {
			throw new NodeOperationError(
				node,
				`${label} parameter ${nullParameter + 1} must not be null`,
				{
					itemIndex,
					description: 'A null value also matches items where the field is missing',
				},
			);
		}
	}

	if (parameters.length === 0) return parsedQuery;

	const usedParameters = new Set<number>();

	const takeParameter = (placeholder: string, parameterIndex: number): QueryParameter => {
		if (parameterIndex < 0 || parameterIndex >= parameters.length) {
			throw new NodeOperationError(
				node,
				`${label} placeholder ${placeholder} has no matching value`,
				{
					itemIndex,
					description: `Add a value for ${placeholder} to ${label} Parameters`,
				},
			);
		}

		usedParameters.add(parameterIndex);
		return parameters[parameterIndex];
	};

	const resolveKey = (key: string): string => {
		const match = PLACEHOLDER.exec(key);
		if (!match) return key;

		const value = takeParameter(key, Number(match[1]) - 1);
		if (
			typeof value !== 'string' ||
			value.length === 0 ||
			value.startsWith('$') ||
			!isSafeObjectProperty(value)
		) {
			throw new NodeOperationError(node, `${label} placeholder ${key} is not a valid field name`, {
				itemIndex,
				description:
					'A placeholder used as a field name must resolve to a non-empty string that does not start with "$" and does not name a reserved object property',
			});
		}

		return value;
	};

	const escapeString = (value: QueryParameterScalar): unknown =>
		typeof value === 'string' && value.startsWith('$') ? { $literal: value } : value;

	const bindValue = (value: QueryParameter, shouldEscapeDollarStrings: boolean): unknown => {
		if (!shouldEscapeDollarStrings) return value;
		return Array.isArray(value) ? value.map(escapeString) : escapeString(value);
	};

	const resolveValue = (
		value: unknown,
		shouldEscapeDollarStrings = escapeDollarStrings,
	): unknown => {
		if (typeof value === 'string') {
			const match = PLACEHOLDER.exec(value);
			return match
				? bindValue(takeParameter(value, Number(match[1]) - 1), shouldEscapeDollarStrings)
				: value;
		}

		if (Array.isArray(value)) {
			return value.map((entry) => resolveValue(entry, shouldEscapeDollarStrings));
		}

		if (value !== null && typeof value === 'object') {
			const seenKeys = new Set<string>();

			// Object.fromEntries would let a later key win silently, so a bound field name could
			// replace a clause the author wrote. Reject the collision instead.
			return Object.fromEntries(
				Object.entries(value).map(([key, entry]) => {
					const resolvedKey = resolveKey(key);

					if (seenKeys.has(resolvedKey)) {
						throw new NodeOperationError(
							node,
							`${label} field name "${resolvedKey}" is used more than once`,
							{
								itemIndex,
								description:
									'A parameter bound to a field name must not collide with another field name in the same object, because one clause would silently replace the other',
							},
						);
					}

					seenKeys.add(resolvedKey);
					return [
						resolvedKey,
						resolveValue(
							entry,
							preserveDollarStringsInFields.includes(resolvedKey)
								? false
								: shouldEscapeDollarStrings || escapeDollarStringsInFields.includes(resolvedKey),
						),
					];
				}),
			);
		}

		return value;
	};

	const resolvedQuery = resolveValue(parsedQuery);
	const unusedParameter = parameters.findIndex((_, index) => !usedParameters.has(index));

	if (unusedParameter !== -1) {
		throw new NodeOperationError(node, `${label} parameter ${unusedParameter + 1} is not used`, {
			itemIndex,
			description: `Add $${unusedParameter + 1} to the query or remove the unused parameter`,
		});
	}

	return resolvedQuery;
}
