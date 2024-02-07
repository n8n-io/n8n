import type { DateTime } from 'luxon';
import type {
	FilterConditionValue,
	FilterOperatorType,
	FilterOptionsValue,
	FilterValue,
	INodeProperties,
	Result,
	ValidationResult,
} from '../Interfaces';
import { validateFieldType } from '../TypeValidation';
import * as LoggerProxy from '../LoggerProxy';

type FilterConditionMetadata = {
	index: number;
	unresolvedExpressions: boolean;
	itemIndex: number;
	errorFormat: 'full' | 'inline';
};

export class FilterError extends Error {
	constructor(
		message: string,
		readonly description: string,
	) {
		super(message);
	}
}

function parseSingleFilterValue(
	value: unknown,
	type: FilterOperatorType,
	strict = false,
): ValidationResult {
	return type === 'any' || value === null || value === undefined || value === ''
		? ({ valid: true, newValue: value } as ValidationResult)
		: validateFieldType('filter', value, type, { strict, parseStrings: true });
}

function parseFilterConditionValues(
	condition: FilterConditionValue,
	options: FilterOptionsValue,
	metadata: Partial<FilterConditionMetadata>,
): Result<{ left: unknown; right: unknown }, FilterError> {
	const index = metadata.index ?? 0;
	const itemIndex = metadata.itemIndex ?? 0;
	const errorFormat = metadata.errorFormat ?? 'full';
	const strict = options.typeValidation === 'strict';
	const { operator } = condition;
	const rightType = operator.rightType ?? operator.type;
	const parsedLeftValue = parseSingleFilterValue(condition.leftValue, operator.type, strict);
	const parsedRightValue = parseSingleFilterValue(condition.rightValue, rightType, strict);
	const leftValid =
		parsedLeftValue.valid ||
		(metadata.unresolvedExpressions &&
			typeof condition.leftValue === 'string' &&
			condition.leftValue.startsWith('='));
	const rightValid =
		parsedRightValue.valid ||
		!!operator.singleValue ||
		(metadata.unresolvedExpressions &&
			typeof condition.rightValue === 'string' &&
			condition.rightValue.startsWith('='));
	const leftValueString = String(condition.leftValue);
	const rightValueString = String(condition.rightValue);
	const errorDescription = 'Try to change the operator, or change the type with an expression';
	const inCondition = errorFormat === 'full' ? ` in condition ${index + 1} ` : ' ';
	const itemSuffix = `[item ${itemIndex}]`;

	if (!leftValid && !rightValid) {
		const providedValues = 'The provided values';
		let types = `'${operator.type}'`;
		if (rightType !== operator.type) {
			types = `'${operator.type}' and '${rightType}' respectively`;
		}
		if (strict) {
			return {
				ok: false,
				error: new FilterError(
					`${providedValues} '${leftValueString}' and '${rightValueString}'${inCondition}are not of the expected type ${types} ${itemSuffix}`,
					errorDescription,
				),
			};
		}

		return {
			ok: false,
			error: new FilterError(
				`${providedValues} '${leftValueString}' and '${rightValueString}'${inCondition}cannot be converted to the expected type ${types} ${itemSuffix}`,
				errorDescription,
			),
		};
	}

	const composeInvalidTypeMessage = (field: 'left' | 'right', type: string, value: string) => {
		const fieldNumber = field === 'left' ? 1 : 2;

		if (strict) {
			return `The provided value ${fieldNumber} '${value}'${inCondition}is not of the expected type '${type}' ${itemSuffix}`;
		}
		return `The provided value ${fieldNumber} '${value}'${inCondition}cannot be converted to the expected type '${type}' ${itemSuffix}`;
	};

	if (!leftValid) {
		return {
			ok: false,
			error: new FilterError(
				composeInvalidTypeMessage('left', operator.type, leftValueString),
				errorDescription,
			),
		};
	}

	if (!rightValid) {
		return {
			ok: false,
			error: new FilterError(
				composeInvalidTypeMessage('right', rightType, rightValueString),
				errorDescription,
			),
		};
	}

	return { ok: true, result: { left: parsedLeftValue.newValue, right: parsedRightValue.newValue } };
}

function parseRegexPattern(pattern: string): RegExp {
	const regexMatch = (pattern || '').match(new RegExp('^/(.*?)/([gimusy]*)$'));
	let regex: RegExp;

	if (!regexMatch) {
		regex = new RegExp((pattern || '').toString());
	} else {
		regex = new RegExp(regexMatch[1], regexMatch[2]);
	}

	return regex;
}

export function executeFilterCondition(
	condition: FilterConditionValue,
	filterOptions: FilterOptionsValue,
	metadata: Partial<FilterConditionMetadata> = {},
): boolean {
	const ignoreCase = !filterOptions.caseSensitive;
	const { operator } = condition;
	const parsedValues = parseFilterConditionValues(condition, filterOptions, metadata);

	if (!parsedValues.ok) {
		throw parsedValues.error;
	}

	let { left: leftValue, right: rightValue } = parsedValues.result;

	const exists = leftValue !== undefined && leftValue !== null;
	if (condition.operator.operation === 'exists') {
		return exists;
	} else if (condition.operator.operation === 'notExists') {
		return !exists;
	}

	switch (operator.type) {
		case 'string': {
			if (ignoreCase) {
				if (typeof leftValue === 'string') {
					leftValue = leftValue.toLocaleLowerCase();
				}

				if (
					typeof rightValue === 'string' &&
					!(condition.operator.operation === 'regex' || condition.operator.operation === 'notRegex')
				) {
					rightValue = rightValue.toLocaleLowerCase();
				}
			}

			const left = (leftValue ?? '') as string;
			const right = (rightValue ?? '') as string;

			switch (condition.operator.operation) {
				case 'empty':
					return left.length === 0;
				case 'notEmpty':
					return left.length !== 0;
				case 'equals':
					return left === right;
				case 'notEquals':
					return left !== right;
				case 'contains':
					return left.includes(right);
				case 'notContains':
					return !left.includes(right);
				case 'startsWith':
					return left.startsWith(right);
				case 'notStartsWith':
					return !left.startsWith(right);
				case 'endsWith':
					return left.endsWith(right);
				case 'notEndsWith':
					return !left.endsWith(right);
				case 'regex':
					return parseRegexPattern(right).test(left);
				case 'notRegex':
					return !parseRegexPattern(right).test(left);
			}

			break;
		}
		case 'number': {
			const left = leftValue as number;
			const right = rightValue as number;

			switch (condition.operator.operation) {
				case 'equals':
					return left === right;
				case 'notEquals':
					return left !== right;
				case 'gt':
					return left > right;
				case 'lt':
					return left < right;
				case 'gte':
					return left >= right;
				case 'lte':
					return left <= right;
			}
		}
		case 'dateTime': {
			const left = leftValue as DateTime;
			const right = rightValue as DateTime;

			if (!left || !right) {
				return false;
			}

			switch (condition.operator.operation) {
				case 'equals':
					return left.toMillis() === right.toMillis();
				case 'notEquals':
					return left.toMillis() !== right.toMillis();
				case 'after':
					return left.toMillis() > right.toMillis();
				case 'before':
					return left.toMillis() < right.toMillis();
				case 'afterOrEquals':
					return left.toMillis() >= right.toMillis();
				case 'beforeOrEquals':
					return left.toMillis() <= right.toMillis();
			}
		}
		case 'boolean': {
			const left = leftValue as boolean;
			const right = rightValue as boolean;

			switch (condition.operator.operation) {
				case 'true':
					return left;
				case 'false':
					return !left;
				case 'equals':
					return left === right;
				case 'notEquals':
					return left !== right;
			}
		}
		case 'array': {
			const left = (leftValue ?? []) as unknown[];
			const rightNumber = rightValue as number;

			switch (condition.operator.operation) {
				case 'contains':
					if (ignoreCase && typeof rightValue === 'string') {
						rightValue = rightValue.toLocaleLowerCase();
					}
					return left.includes(rightValue);
				case 'notContains':
					if (ignoreCase && typeof rightValue === 'string') {
						rightValue = rightValue.toLocaleLowerCase();
					}
					return !left.includes(rightValue);
				case 'lengthEquals':
					return left.length === rightNumber;
				case 'lengthNotEquals':
					return left.length !== rightNumber;
				case 'lengthGt':
					return left.length > rightNumber;
				case 'lengthLt':
					return left.length < rightNumber;
				case 'lengthGte':
					return left.length >= rightNumber;
				case 'lengthLte':
					return left.length <= rightNumber;
				case 'empty':
					return left.length === 0;
				case 'notEmpty':
					return left.length !== 0;
			}
		}
		case 'object': {
			const left = leftValue;

			switch (condition.operator.operation) {
				case 'empty':
					return !!left && Object.keys(left).length === 0;
				case 'notEmpty':
					return !!left && Object.keys(left).length !== 0;
			}
		}
	}

	LoggerProxy.warn(`Unknown filter parameter operator "${operator.type}:${operator.operation}"`);

	return false;
}

type ExecuteFilterOptions = {
	itemIndex?: number;
};
export function executeFilter(
	value: FilterValue,
	{ itemIndex }: ExecuteFilterOptions = {},
): boolean {
	const conditionPass = (condition: FilterConditionValue, index: number) =>
		executeFilterCondition(condition, value.options, { index, itemIndex });

	if (value.combinator === 'and') {
		return value.conditions.every(conditionPass);
	} else if (value.combinator === 'or') {
		return value.conditions.some(conditionPass);
	}

	LoggerProxy.warn(`Unknown filter combinator "${value.combinator as string}"`);

	return false;
}

export const validateFilterParameter = (
	nodeProperties: INodeProperties,
	value: FilterValue,
): Record<string, string[]> => {
	return value.conditions.reduce(
		(issues, condition, index) => {
			const key = `${nodeProperties.name}.${index}`;

			try {
				parseFilterConditionValues(condition, value.options, {
					index,
					unresolvedExpressions: true,
					errorFormat: 'inline',
				});
			} catch (error) {
				if (error instanceof FilterError) {
					issues[key].push(error.message);
				}
			}

			return issues;
		},
		{} as Record<string, string[]>,
	);
};
