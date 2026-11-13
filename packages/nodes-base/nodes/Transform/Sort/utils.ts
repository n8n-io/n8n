import isEqual from 'lodash/isEqual';
import lt from 'lodash/lt';
import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { JsTaskRunnerSandbox } from '../../Code/JsTaskRunnerSandbox';

const returnRegExp = /\breturn\b/;
const numericStringRegExp = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/;

function isNumericString(value: unknown): value is string {
	if (typeof value !== 'string') return false;

	const trimmed = value.trim();
	return numericStringRegExp.test(trimmed) && Number.isFinite(Number(trimmed));
}

/**
 * Compares two sort values in ascending order.
 *
 * Version 1.1 compares two numeric strings by value. Every other case keeps
 * the version 1 comparison: strings are case-insensitive and otherwise
 * compared with the lodash helpers.
 */
export function compareSortValues(a: unknown, b: unknown, numericStrings = false): number {
	if (numericStrings && isNumericString(a) && isNumericString(b)) {
		const left = Number(a);
		const right = Number(b);

		if (left === right) return 0;
		return left < right ? -1 : 1;
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
