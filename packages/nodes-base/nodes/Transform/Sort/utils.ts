import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { JsTaskRunnerSandbox } from '../../Code/JsTaskRunnerSandbox';

const returnRegExp = /\breturn\b/;
const NUMERIC_STRING_REGEX = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;
const INTEGER_STRING_REGEX = /^[+-]?\d+$/;

export function isNumericString(value: unknown): value is string {
	return typeof value === 'string' && NUMERIC_STRING_REGEX.test(value.trim());
}

export function compareNumericStrings(a: string, b: string): number {
	const x = a.trim();
	const y = b.trim();

	// BigInt keeps integers beyond 2^53 exact
	if (INTEGER_STRING_REGEX.test(x) && INTEGER_STRING_REGEX.test(y)) {
		const bigX = BigInt(x);
		const bigY = BigInt(y);
		if (bigX === bigY) return 0;
		return bigX < bigY ? -1 : 1;
	}

	const numX = Number(x);
	const numY = Number(y);
	if (numX === numY) return 0;
	return numX < numY ? -1 : 1;
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
