import { NodeOperationError, type IExecuteFunctions, type INodeExecutionData } from 'n8n-workflow';

import { execute_V_0240_rows_create } from './rows_create.executor';
import { execute_V_0240_rows_delete } from './rows_delete.executor';
import { execute_V_0240_rows_get } from './rows_get.executor';
import { execute_V_0240_rows_get_all } from './rows_get_all.executor';
import { execute_V_0240_rows_update } from './rows_update.executor';
import { execute_V_0240_rows_upsert } from './rows_upsert.executor';

export class RowsExecutor {
	constructor(protected executeFunctions: IExecuteFunctions) {}

	async execute(): Promise<INodeExecutionData[][]> {
		const operation = this.executeFunctions.getNodeParameter('operation', 0) as string;
		if (operation === 'get') {
			return execute_V_0240_rows_get.call(this.executeFunctions);
		} else if (operation === 'getAll') {
			return execute_V_0240_rows_get_all.call(this.executeFunctions);
		} else if (operation === 'delete') {
			return execute_V_0240_rows_delete.call(this.executeFunctions);
		} else if (operation === 'create') {
			return execute_V_0240_rows_create.call(this.executeFunctions);
		} else if (operation === 'update') {
			return execute_V_0240_rows_update.call(this.executeFunctions);
		} else if (operation === 'upsert') {
			return execute_V_0240_rows_upsert.call(this.executeFunctions);
		} else {
			throw new NodeOperationError(this.executeFunctions.getNode(), 'Operation not supported');
		}
	}
}
