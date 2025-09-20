import { type IExecuteFunctions, type INodeExecutionData } from 'n8n-workflow';

import * as base from './base';
import * as rows from './rows';
import { v0200Execute } from './v0200Execute';

export async function router(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	let operationResult: INodeExecutionData[][] = [];

	const resource = this.getNodeParameter('resource', 0);
	const operation = this.getNodeParameter('operation', 0);
	const version = this.getNodeParameter('version', 0);

	if (version === 3) {
		operationResult = await v0200Execute.call(this);
	} else {
		switch (resource) {
			case 'base': {
				switch (operation) {
					case 'get': {
						operationResult = await base.get.execute.call(this);
						break;
					}
					case 'getAll': {
						operationResult = await base.getAll.execute.call(this);
						break;
					}
				}
				break;
			}
			case 'row': {
				switch (operation) {
					case 'count': {
						operationResult = await rows.count.execute.call(this);
						break;
					}
					case 'get': {
						operationResult = await rows.get.execute.call(this);
						break;
					}
					case 'getAll': {
						operationResult = await rows.getAll.execute.call(this);
						break;
					}
					case 'create': {
						operationResult = await rows.create.execute.call(this);
						break;
					}
					case 'link': {
						operationResult = await rows.link.execute.call(this);
						break;
					}
					case 'linklist': {
						operationResult = await rows.linklist.execute.call(this);
						break;
					}
					case 'unlink': {
						operationResult = await rows.unlink.execute.call(this);
						break;
					}
					case 'update': {
						operationResult = await rows.update.execute.call(this);
						break;
					}
					case 'upsert': {
						operationResult = await rows.upsert.execute.call(this);
						break;
					}
					case 'upload': {
						operationResult = await rows.upload.execute.call(this);
						break;
					}
					case 'delete': {
						operationResult = await rows.delete.execute.call(this);
						break;
					}
				}
				break;
			}
		}
	}

	return operationResult;
}
