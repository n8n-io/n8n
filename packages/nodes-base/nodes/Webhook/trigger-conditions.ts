import get from 'lodash/get';
import toPath from 'lodash/toPath';
import type {
	FilterConditionValue,
	FilterOperatorValue,
	FilterOptionsValue,
	INode,
	INodeProperties,
	Logger,
	NodeParameterValue,
} from 'n8n-workflow';
import { executeFilterCondition } from 'n8n-workflow';

/**
 * Flat operator key → filter-core operator, single-sourced between the UI
 * dropdown and evaluation. `hasValue` drives the Value field's visibility.
 */
const TRIGGER_CONDITION_OPERATORS: Record<string, FilterOperatorValue & { hasValue: boolean }> = {
	contains: { type: 'string', operation: 'contains', hasValue: true },
	notContains: { type: 'string', operation: 'notContains', hasValue: true },
	notExists: { type: 'any', operation: 'notExists', singleValue: true, hasValue: false },
	notRegex: { type: 'string', operation: 'notRegex', hasValue: true },
	endsWith: { type: 'string', operation: 'endsWith', hasValue: true },
	exists: { type: 'any', operation: 'exists', singleValue: true, hasValue: false },
	equals: { type: 'string', operation: 'equals', hasValue: true },
	isFalse: { type: 'boolean', operation: 'false', singleValue: true, hasValue: false },
	gt: { type: 'number', operation: 'gt', hasValue: true },
	gte: { type: 'number', operation: 'gte', hasValue: true },
	lt: { type: 'number', operation: 'lt', hasValue: true },
	lte: { type: 'number', operation: 'lte', hasValue: true },
	notEquals: { type: 'string', operation: 'notEquals', hasValue: true },
	isTrue: { type: 'boolean', operation: 'true', singleValue: true, hasValue: false },
	regex: { type: 'string', operation: 'regex', hasValue: true },
	startsWith: { type: 'string', operation: 'startsWith', hasValue: true },
};

const OPERATORS_WITHOUT_VALUE = Object.keys(TRIGGER_CONDITION_OPERATORS).filter(
	(key) => !TRIGGER_CONDITION_OPERATORS[key].hasValue,
);

export const triggerConditionsProperty: INodeProperties = {
	displayName: 'Trigger Conditions',
	name: 'triggerConditions',
	type: 'fixedCollection',
	placeholder: 'Add Condition',
	typeOptions: {
		multipleValues: true,
		sortable: true,
	},
	default: {},
	displayOptions: {
		show: {
			'@version': [{ _cnd: { gte: 2.2 } }],
		},
	},
	description:
		'Only start the workflow when the request matches all of these conditions. Non-matching requests get a 200 response, without creating an execution.',
	options: [
		{
			name: 'conditions',
			displayName: 'Condition',
			values: [
				{
					displayName: 'Source',
					name: 'source',
					type: 'options',
					noDataExpression: true,
					default: 'body',
					options: [
						{ name: 'Body', value: 'body' },
						{ name: 'Header', value: 'headers' },
						{ name: 'Query Parameter', value: 'query' },
					],
					description: 'Which part of the request to read the value from',
				},
				{
					displayName: 'Property',
					name: 'property',
					type: 'string',
					noDataExpression: true,
					default: '',
					placeholder: 'e.g. campaign.name',
					description: 'Dot-notation path to the value inside the selected source',
				},
				{
					displayName: 'Operator',
					name: 'operator',
					type: 'options',
					noDataExpression: true,
					default: 'equals',
					options: [
						{ name: 'Contains', value: 'contains' },
						{ name: 'Does Not Contain', value: 'notContains' },
						{ name: 'Does Not Exist', value: 'notExists' },
						{ name: 'Does Not Match Regex', value: 'notRegex' },
						{ name: 'Ends With', value: 'endsWith' },
						{ name: 'Exists', value: 'exists' },
						{ name: 'Is Equal To', value: 'equals' },
						{ name: 'Is False', value: 'isFalse' },
						{ name: 'Is Greater Than', value: 'gt' },
						{ name: 'Is Greater Than or Equal To', value: 'gte' },
						{ name: 'Is Less Than', value: 'lt' },
						{ name: 'Is Less Than or Equal To', value: 'lte' },
						{ name: 'Is Not Equal To', value: 'notEquals' },
						{ name: 'Is True', value: 'isTrue' },
						{ name: 'Matches Regex', value: 'regex' },
						{ name: 'Starts With', value: 'startsWith' },
					],
				},
				{
					displayName: 'Value',
					name: 'value',
					type: 'string',
					noDataExpression: true,
					default: '',
					displayOptions: {
						hide: {
							operator: OPERATORS_WITHOUT_VALUE,
						},
					},
					description: 'The value to compare against',
				},
			],
		},
	],
};

const FILTER_OPTIONS: FilterOptionsValue = {
	caseSensitive: true,
	leftValue: '',
	typeValidation: 'loose',
	version: 3,
};

const FORBIDDEN_PATH_SEGMENTS = ['__proto__', 'constructor', 'prototype'];

interface TriggerConditionRow {
	source: 'body' | 'headers' | 'query';
	property: string;
	operator: string;
	value?: string;
}

function isConditionRow(row: unknown): row is TriggerConditionRow {
	if (row === null || typeof row !== 'object') return false;
	const { source, property, operator, value } = row as Record<string, unknown>;
	return (
		(source === 'body' || source === 'headers' || source === 'query') &&
		typeof property === 'string' &&
		typeof operator === 'string' &&
		(value === undefined || typeof value === 'string')
	);
}

function resolveLeftValue(
	request: TriggerConditionsRequest,
	source: TriggerConditionRow['source'],
	property: string,
): unknown {
	// Node lowercases incoming header names.
	const path = source === 'headers' ? property.toLowerCase() : property;
	const segments = toPath(path);
	if (segments.length === 0) return undefined;
	if (segments.some((segment) => FORBIDDEN_PATH_SEGMENTS.includes(segment))) return undefined;
	return get(request[source], segments);
}

export interface TriggerConditionsRequest {
	body: unknown;
	query: unknown;
	headers: unknown;
}

/**
 * Evaluates the expressionless "Trigger Conditions" (Webhook node >= 2.2,
 * AND-only: every condition must match) natively against the request. Reads
 * the raw stored parameters so no expression engine is ever involved, keeping
 * the webhook-phase isolate skip intact. Fails open (returns true) on any
 * malformed input or evaluation error, matching the deprecated
 * expression-based "Only Run If" variant's behavior.
 */
export function checkTriggerConditions(
	node: INode,
	request: TriggerConditionsRequest,
	logger: Logger,
): boolean {
	const rawOptions = node.parameters?.options as
		| { triggerConditions?: { conditions?: unknown } }
		| undefined;
	const rawConditions = rawOptions?.triggerConditions?.conditions;
	if (!Array.isArray(rawConditions) || rawConditions.length === 0) return true;

	const failOpen = (message: string) => {
		logger.warn(`Webhook "Trigger Conditions" ${message}; allowing request through`, {
			nodeName: node.name,
		});
		return true;
	};

	const results: boolean[] = [];
	for (const [index, row] of rawConditions.entries()) {
		if (!isConditionRow(row)) return failOpen(`condition ${index + 1} is malformed`);

		// `noDataExpression` is UI-only: imported JSON can still carry `=`-prefixed
		// strings. They are never evaluated here — treat the row as unusable.
		if ([row.property, row.value].some((v) => typeof v === 'string' && v.startsWith('='))) {
			return failOpen(`condition ${index + 1} contains an expression, which is not supported`);
		}

		const operator = TRIGGER_CONDITION_OPERATORS[row.operator];
		if (!operator) return failOpen(`condition ${index + 1} has unknown operator "${row.operator}"`);

		const condition: FilterConditionValue = {
			id: String(index),
			leftValue: resolveLeftValue(request, row.source, row.property) as NodeParameterValue,
			operator,
			rightValue: operator.hasValue ? (row.value ?? '') : undefined,
		};

		try {
			results.push(
				executeFilterCondition(condition, FILTER_OPTIONS, {
					index,
					itemIndex: 0,
					errorFormat: 'inline',
				}),
			);
		} catch (error) {
			return failOpen(`condition ${index + 1} failed to evaluate: ${(error as Error).message}`);
		}
	}

	return results.every(Boolean);
}
