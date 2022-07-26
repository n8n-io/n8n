import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	INodeExecutionData,
} from 'n8n-workflow';

import * as sheet from './sheet';
import * as spreadsheet from './spreadsheet';
import { GoogleSheets } from './Interfaces';

export async function router(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const operationResult: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		const resource = this.getNodeParameter<GoogleSheets>('resource', i);
		let operation = this.getNodeParameter('operation', i);

		if (operation === 'del') {
			operation = 'delete';
		}

		const googlesheets = {
			resource,
			operation,
		} as GoogleSheets;

		try {
			if (googlesheets.resource === 'sheet') {
				operationResult.push(...await sheet[googlesheets.operation].execute.call(this, i));
			} else if (googlesheets.resource === 'spreadsheet') {
				operationResult.push(...await spreadsheet[googlesheets.operation].execute.call(this, i));
			}
		} catch (err) {
			if (this.continueOnFail()) {
				operationResult.push({json: this.getInputData(i)[0].json, error: err});
			} else {
				if (err.context) err.context.itemIndex = i;
				throw err;
			}
		}
	}

	return [operationResult];
}
