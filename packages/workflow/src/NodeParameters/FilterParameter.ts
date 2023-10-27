import type { DateTime } from 'luxon';
import type { FilterConditionValue, FilterOptionsValue, FilterValue } from '../Interfaces';
import { validateFieldType } from '../NodeHelpers';
import * as LoggerProxy from '../LoggerProxy';

export function executeFilterCondition(
	condition: FilterConditionValue,
	options: FilterOptionsValue,
): boolean {
	const { operator } = condition;
	const rightType = operator.rightType ?? operator.type;
	const parsedLeftValue =
		operator.type === 'any'
			? { valid: true, newValue: condition.leftValue }
			: validateFieldType('filter', condition.leftValue, operator.type);
	const parsedRightValue =
		rightType === 'any' || operator.singleValue
			? { valid: true, newValue: condition.rightValue }
			: validateFieldType('filter', condition.rightValue, rightType);

	if (!parsedLeftValue.valid || !parsedRightValue.valid) {
		return false;
	}

	let leftValue = parsedLeftValue.newValue;
	let rightValue = parsedRightValue.newValue;

	if (!options.caseSensitive) {
		if (typeof leftValue === 'string') {
			leftValue = leftValue.toLocaleLowerCase();
		}

		if (typeof rightValue === 'string') {
			rightValue = rightValue.toLocaleLowerCase();
		}
	}

	switch (operator.type) {
		case 'any': {
			const exists = leftValue !== undefined && leftValue !== null;

			switch (condition.operator.operation) {
				case 'exists':
					return exists;
				case 'notExists':
					return !exists;
			}

			break;
		}
		case 'string': {
			const left = (leftValue ?? '') as string;
			const right = (rightValue ?? '') as string;

			switch (condition.operator.operation) {
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
					return new RegExp(right).test(left);
				case 'notRegex':
					return !new RegExp(right).test(left);
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
			const rightArray = (rightValue ?? []) as unknown[];

			switch (condition.operator.operation) {
				case 'contains':
					return left.includes(rightValue as unknown);
				case 'notContains':
					return !left.includes(rightValue as unknown);
				case 'lengthEquals':
					return left.length === rightArray.length;
				case 'lengthNotEquals':
					return left.length !== rightArray.length;
				case 'lengthGt':
					return left.length > rightArray.length;
				case 'lengthLt':
					return left.length < rightArray.length;
				case 'lengthGte':
					return left.length >= rightArray.length;
				case 'lengthLte':
					return left.length <= rightArray.length;
			}
		}
		case 'object': {
			const left = leftValue ?? {};

			switch (condition.operator.operation) {
				case 'empty':
					return Object.keys(left).length === 0;
				case 'notEmpty':
					return Object.keys(left).length !== 0;
			}
		}
	}

	LoggerProxy.warn(`Unknown filter parameter operator "${operator.type}:${operator.operation}"`);

	return false;
}

export function executeFilter(value: FilterValue): boolean {
	if (value.combinator === 'and') {
		return value.conditions.every((condition) => executeFilterCondition(condition, value.options));
	} else if (value.combinator === 'or') {
		return value.conditions.some((condition) => executeFilterCondition(condition, value.options));
	}

	LoggerProxy.warn(`Unknown filter combinator "${value.combinator as string}"`);

	return false;
}
