import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionType } from 'n8n-workflow';

import * as fromFile from './fromFile.operation';
import * as toFile from './toFile.operation';
import { operationProperty } from '../description';

export class SpreadsheetFileV2 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			version: 2,
			defaults: {
				name: 'Spreadsheet File',
				color: '#2244FF',
			},
			inputs: [NodeConnectionType.Main],
			outputs: [NodeConnectionType.Main],
			properties: [operationProperty, ...fromFile.description, ...toFile.description],
		};
	}

	async execute(this: IExecuteFunctions) {
		const items = this.getInputData();
		const operation = this.getNodeParameter('operation', 0);
		let returnData: INodeExecutionData[] = [];

		if (operation === 'fromFile') {
			returnData = await fromFile.execute.call(this, items);
		}

		if (operation === 'toFile') {
			returnData = await toFile.execute.call(this, items);
		}

		return [returnData];
	}
}
