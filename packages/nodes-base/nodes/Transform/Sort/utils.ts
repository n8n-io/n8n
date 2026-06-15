import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { JsTaskRunnerSandbox } from '../../Code/JsTaskRunnerSandbox';

const returnRegExp = /\breturn\b/;

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
