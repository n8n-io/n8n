import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { RowsExecutor } from './rows.executor';
import { BaseExecutor } from './base.executor';

export class V0240Executor {
	constructor(protected executeFunctions: IExecuteFunctions) {}

	async execute(): Promise<INodeExecutionData[][]> {
		const resource = this.executeFunctions.getNodeParameter('resource', 0) as string;

		if (resource === 'base') {
			const executor = new BaseExecutor(this.executeFunctions);
			return executor.execute();
		} else if (resource === 'row') {
			const executor = new RowsExecutor(this.executeFunctions);
			return executor.execute();
		} else {
			throw new NodeOperationError(
				this.executeFunctions.getNode(),
				`The resource "${resource}" is not supported for API version 4.`,
			);
		}
	}
}
