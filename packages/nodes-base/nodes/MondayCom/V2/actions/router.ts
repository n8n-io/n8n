import {
	NodeOperationError,
	type IDataObject,
	type IExecuteFunctions,
	type INodeExecutionData,
} from 'n8n-workflow';

import * as board from './board';
import * as column from './column';
import * as group from './group';
import * as item from './item';
import type { MondayComPerItemType } from './node.type';
import * as update from './update';
import { MondayGraphQLClient } from '../transport/MondayGraphQLClient';

type OperationExecute = (
	this: IExecuteFunctions,
	client: MondayGraphQLClient,
	itemIndex: number,
) => Promise<IDataObject | IDataObject[]>;

export async function router(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];

	// API version is pinned node-wide (constants.ts), not per credential.
	const client = new MondayGraphQLClient(this);

	const resource = this.getNodeParameter('resource', 0);
	const operation = this.getNodeParameter('operation', 0);

	// Bulk Import consumes ALL input items into ONE import job (in mapped
	// mode each input item is one CSV row) — run once per execution.
	if (resource === 'item' && operation === 'bulkImport') {
		try {
			const rows = await item.bulkImport.execute.call(this, client, items.length);
			returnData.push(...rows);
		} catch (error) {
			if (this.continueOnFail()) {
				returnData.push({
					json: { error: (error as Error).message },
					pairedItem: { item: 0 },
				});
			} else {
				// Errors from MondayGraphQLClient are already mapped NodeApiErrors.
				throw error;
			}
		}
		return [returnData];
	}

	const monday = { resource, operation } as MondayComPerItemType;

	for (let i = 0; i < items.length; i++) {
		try {
			let execute: OperationExecute | undefined;
			switch (monday.resource) {
				case 'board':
					execute = board[monday.operation]?.execute;
					break;
				case 'column':
					execute = column[monday.operation]?.execute;
					break;
				case 'group':
					execute = group[monday.operation]?.execute;
					break;
				case 'item':
					execute = item[monday.operation]?.execute;
					break;
				case 'update':
					execute = update[monday.operation]?.execute;
					break;
			}
			if (!execute) {
				throw new NodeOperationError(
					this.getNode(),
					`The operation "${String(operation)}" is not supported`,
					{ itemIndex: i },
				);
			}
			const result = await execute.call(this, client, i);
			for (const json of Array.isArray(result) ? result : [result]) {
				returnData.push({ json, pairedItem: { item: i } });
			}
		} catch (error) {
			if (this.continueOnFail()) {
				returnData.push({
					json: { error: (error as Error).message },
					pairedItem: { item: i },
				});
				continue;
			}
			// Errors from MondayGraphQLClient are already mapped NodeApiErrors.
			throw error;
		}
	}

	return [returnData];
}
