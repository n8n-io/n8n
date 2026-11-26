import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import * as alert from './alert';
import * as case_ from './case';
import * as comment from './comment';
import * as log from './log';
import type { TheHiveType } from './node.type';
import * as observable from './observable';
import * as page from './page';
import * as query from './query';
import * as task from './task';

export async function router(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];
	const length = items.length;

	const resource = this.getNodeParameter<TheHiveType>('resource', 0);
	const operation = this.getNodeParameter('operation', 0);

	let executionData: INodeExecutionData[] = [];

	const theHiveNodeData = {
		resource,
		operation,
	} as TheHiveType;

	for (let i = 0; i < length; i++) {
		try {
			switch (theHiveNodeData.resource) {
				case 'alert':
					executionData = await alert[theHiveNodeData.operation].execute.call(this, i, items[i]);
					break;
				case 'case':
					executionData = await case_[theHiveNodeData.operation].execute.call(this, i, items[i]);
					break;
				case 'comment':
					executionData = await comment[theHiveNodeData.operation].execute.call(this, i);
					break;
				case 'log':
					executionData = await log[theHiveNodeData.operation].execute.call(this, i, items[i]);
					break;
				case 'observable':
					executionData = await observable[theHiveNodeData.operation].execute.call(
						this,
						i,
						items[i],
					);
					break;
				case 'page':
					executionData = await page[theHiveNodeData.operation].execute.call(this, i);
					break;
				case 'query':
					executionData = await query[theHiveNodeData.operation].execute.call(this, i);
					break;
				case 'task':
					executionData = await task[theHiveNodeData.operation].execute.call(this, i, items[i]);
					break;
				default:
					throw new NodeOperationError(
						this.getNode(),
						`The operation "${operation}" is not supported!`,
					);
			}
			returnData.push(...executionData);
		} catch (error) {
			if (this.continueOnFail()) {
				let description: string | null = null;
				let httpCode: string | null = null;
				if (error instanceof NodeApiError) {
					// for e.g. connection errors the detail is only in `messages`, not `description`
					description =
						error.description ??
						(error.messages.length ? [...new Set(error.messages)].join(' | ') : null);
					httpCode = error.httpCode ?? null;
				}
				executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray({ error: error.message, description, httpCode }),
					{ itemData: { item: i } },
				);
				if (this.getNode().onError === 'continueErrorOutput') {
					// core routes an item to the error output only if `item.error` is set
					// (or `json` is exactly `{error}` / `{error, message}`), see
					// WorkflowExecute.handleNodeErrorOutput
					const nodeError =
						error instanceof NodeApiError || error instanceof NodeOperationError
							? error
							: new NodeOperationError(this.getNode(), error as Error);
					for (const item of executionData) {
						item.error = nodeError;
					}
				}
				returnData.push(...executionData);
				continue;
			}
			throw error;
		}
	}
	return [returnData];
}
