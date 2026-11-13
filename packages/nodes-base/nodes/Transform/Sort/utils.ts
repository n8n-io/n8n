import isEqual from 'lodash/isEqual';
import lt from 'lodash/lt';
import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { JsTaskRunnerSandbox } from '../../Code/JsTaskRunnerSandbox';

const returnRegExp = /\breturn\b/;
const numericStringRegExp = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/;
const numericStringPartsRegExp = /^([+-]?)(\d*)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/;

interface ParsedNumericString {
	sign: -1 | 0 | 1;
	digits: string;
	exponent: number;
}

/**
 * Checks if a value is a decimal string that Number can represent.
 */
export function isNumericString(value: unknown): value is string {
	if (typeof value !== 'string') return false;

	const trimmed = value.trim();
	return numericStringRegExp.test(trimmed) && Number.isFinite(Number(trimmed));
}

function parseNumericString(value: string): ParsedNumericString {
	const match = numericStringPartsRegExp.exec(value.trim());
	if (!match) return { sign: 0, digits: '', exponent: 0 };

	const digitsPart = (match[2] ?? '') + (match[3] ?? '');
	const digits = digitsPart.replace(/^0+/, '');
	if (!digits) return { sign: 0, digits: '', exponent: 0 };

	const trailingZeros = digits.length - digits.replace(/0+$/, '').length;
	const exponent = Number(match[4] ?? '0') - (match[3]?.length ?? 0) + trailingZeros;

	return {
		sign: match[1] === '-' ? -1 : 1,
		digits: trailingZeros > 0 ? digits.slice(0, -trailingZeros) : digits,
		exponent,
	};
}

/**
 * Compares two numeric strings exactly, without converting them to Number.
 */
export function compareNumericStrings(a: string, b: string): number {
	const left = parseNumericString(a);
	const right = parseNumericString(b);

	if (left.sign !== right.sign) return left.sign < right.sign ? -1 : 1;
	if (left.sign === 0) return 0;

	const leftMagnitude = left.exponent + left.digits.length;
	const rightMagnitude = right.exponent + right.digits.length;

	let comparison: number;
	if (leftMagnitude !== rightMagnitude) {
		comparison = leftMagnitude < rightMagnitude ? -1 : 1;
	} else {
		const length = Math.max(left.digits.length, right.digits.length);
		const leftDigits = left.digits.padEnd(length, '0');
		const rightDigits = right.digits.padEnd(length, '0');
		comparison = leftDigits < rightDigits ? -1 : leftDigits > rightDigits ? 1 : 0;
	}

	if (comparison === 0) return 0;
	return left.sign * comparison;
}

/**
 * Compares two sort values in ascending order.
 *
 * Version 1.1 compares two numeric strings by value. A numeric string sorts
 * before a non-numeric value, so the order stays the same for any input.
 * Every other case keeps the version 1 comparison: strings are
 * case-insensitive and otherwise compared with the lodash helpers.
 */
export function compareSortValues(a: unknown, b: unknown, numericStrings = false): number {
	if (numericStrings) {
		const aIsNumeric = isNumericString(a);
		const bIsNumeric = isNumericString(b);

		if (aIsNumeric && bIsNumeric) return compareNumericStrings(a, b);
		if (aIsNumeric !== bIsNumeric) return aIsNumeric ? -1 : 1;
	}

	const left = typeof a === 'string' ? a.toLowerCase() : a;
	const right = typeof b === 'string' ? b.toLowerCase() : b;

	if (isEqual(left, right)) return 0;
	return lt(left, right) ? -1 : 1;
}

export async function sortByCode(this: IExecuteFunctions): Promise<INodeExecutionData[]> {
	const userCode = this.getNodeParameter('code', 0) as string;
	if (!returnRegExp.test(userCode)) {
		throw new NodeOperationError(
			this.getNode(),
			"Sort code doesn't return. Please add a 'return' statement to your code",
		);
	}

	const mode = this.getMode();
	const items = this.getInputData();
	const code = `return items.sort((a, b) => { ${userCode} })`;
	const chunkSize = undefined;
	const sandbox = new JsTaskRunnerSandbox(mode, this, chunkSize, { items });
	const executionResult = await sandbox.runCode<INodeExecutionData[]>(code);

	return executionResult;
}
