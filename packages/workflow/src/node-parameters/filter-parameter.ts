import type { DateTime } from 'luxon';

import { ApplicationError } from '@n8n/errors';
import type {
	FilterConditionValue,
	FilterOperatorType,
	FilterOptionsValue,
	FilterValue,
	INodeProperties,
	ValidationResult,
} from '../interfaces';
import * as LoggerProxy from '../logger-proxy';
import type { Result } from '../result';
import { validateFieldType } from '../type-validation';

type FilterConditionMetadata = {
	index: number;
	unresolvedExpressions: boolean;
	itemIndex: number;
	errorFormat: 'full' | 'inline';
};

export class FilterError extends ApplicationError {
	constructor(
		message: string,
		readonly description: string,
	) {
		super(message, { level: 'warning' });
	}
}

function parseSingleFilterValue(
	value: unknown,
	type: FilterOperatorType,
	strict = false,
	version: FilterOptionsValue['version'] = 1,
): ValidationResult {
	if (type === 'any' || value === null || value === undefined) {
		return { valid: true, newValue: value } as ValidationResult;
	}

	if (type === 'boolean' && !strict) {
		if (version >= 2) {
			const result = validateFieldType('filter', value, type);
			if (result.valid) return result;
		}

		return { valid: true, newValue: Boolean(value) };
	}

	if (type === 'number' && Number.isNaN(value)) {
		return { valid: true, newValue: value };
	}

	return validateFieldType('filter', value, type, { strict, parseStrings: true });
}

const withIndefiniteArticle = (noun: string): string => {
	const article = 'aeiou'.includes(noun.charAt(0)) ? 'an' : 'a';
	return `${article} ${noun}`;
};

function parseFilterConditionValues(
	condition: FilterConditionValue,
	options: FilterOptionsValue,
	metadata: Partial<FilterConditionMetadata>,
): Result<{ left: unknown; right: unknown }, FilterError> {
	const index = metadata.index ?? 0;
	const itemIndex = metadata.itemIndex ?? 0;
	const errorFormat = metadata.errorFormat ?? 'full';
	const strict = options.typeValidation === 'strict';
	const version = options.version ?? 1;
	const { operator } = condition;
	const rightType = operator.rightType ?? operator.type;
	const parsedLeftValue = parseSingleFilterValue(
		condition.leftValue,
		operator.type,
		strict,
		version,
	);
	const parsedRightValue = parseSingleFilterValue(condition.rightValue, rightType, strict, version);
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
	const suffix =
		errorFormat === 'full' ? `[condition ${index}, item ${itemIndex}]` : `[item ${itemIndex}]`;

	const composeInvalidTypeMessage = (type: string, fromType: string, value: string) => {
		fromType = fromType.toLocaleLowerCase();
		if (strict) {
			return `Wrong type: '${value}' is ${withIndefiniteArticle(
				fromType,
			)} but was expecting ${withIndefiniteArticle(type)} ${suffix}`;
		}
		return `Conversion error: the ${fromType} '${value}' can't be converted to ${withIndefiniteArticle(
			type,
		)} ${suffix}`;
	};

	const getTypeDescription = (isStrict: boolean) => {
		if (isStrict)
			return "Try changing the type of comparison. Alternatively you can enable 'Convert types where required'.";
		return 'Try changing the type of the comparison.';
	};

	const composeInvalidTypeDescription = (
		type: string,
		fromType: string,
		valuePosition: 'first' | 'second',
	) => {
		fromType = fromType.toLocaleLowerCase();
		const expectedType = withIndefiniteArticle(type);

		let convertionFunction = '';
		if (type === 'string') {
			convertionFunction = '.toString()';
		} else if (type === 'number') {
			convertionFunction = '.toNumber()';
		} else if (type === 'boolean') {
			convertionFunction = '.toBoolean()';
		}

		if (strict && convertionFunction) {
			const suggestFunction = ` by adding <code>${convertionFunction}</code>`;
			return `
<p>Try either:</p>
<ol>
  <li>Enabling 'Convert types where required'</li>
  <li>Converting the ${valuePosition} field to ${expectedType}${suggestFunction}</li>
</ol>
			`;
		}

		return getTypeDescription(strict);
	};

	if (!leftValid && !rightValid && typeof condition.leftValue === typeof condition.rightValue) {
		return {
			ok: false,
			error: new FilterError(
				`Comparison type expects ${withIndefiniteArticle(operator.type)} but both fields are ${withIndefiniteArticle(
					typeof condition.leftValue,
				)}`,
				getTypeDescription(strict),
			),
		};
	}

	if (!leftValid) {
		return {
			ok: false,
			error: new FilterError(
				composeInvalidTypeMessage(operator.type, typeof condition.leftValue, leftValueString),
				composeInvalidTypeDescription(operator.type, typeof condition.leftValue, 'first'),
			),
		};
	}

	if (!rightValid) {
		return {
			ok: false,
			error: new FilterError(
				composeInvalidTypeMessage(rightType, typeof condition.rightValue, rightValueString),
				composeInvalidTypeDescription(rightType, typeof condition.rightValue, 'second'),
			),
		};
	}

	return {
		ok: true,
		result: {
			left: parsedLeftValue.valid ? parsedLeftValue.newValue : undefined,
			right: parsedRightValue.valid ? parsedRightValue.newValue : undefined,
		},
	};
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

export function arrayContainsValue(array: unknown[], value: unknown, ignoreCase: boolean): boolean {
	if (ignoreCase && typeof value === 'string') {
		return array.some((item) => {
			if (typeof item !== 'string') {
				return false;
			}
			return item.toString().toLocaleLowerCase() === value.toLocaleLowerCase();
		});
	}
	return array.includes(value);
}

// eslint-disable-next-line complexity
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

	const exists = leftValue !== undefined && leftValue !== null && !Number.isNaN(leftValue);
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
				case 'empty':
					return !exists;
				case 'notEmpty':
					return exists;
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

			if (condition.operator.operation === 'empty') {
				return !exists;
			} else if (condition.operator.operation === 'notEmpty') {
				return exists;
			}

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
				case 'empty':
					return !exists;
				case 'notEmpty':
					return exists;
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
					return arrayContainsValue(left, rightValue, ignoreCase);
				case 'notContains':
					return !arrayContainsValue(left, rightValue, ignoreCase);
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
					return !left || Object.keys(left).length === 0;
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
